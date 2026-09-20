import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { loadConfig, type AppConfig } from "../config.js";
import { authenticateApiKey } from "../security/admin-auth.js";
import { verifyHmac } from "../security/hmac.js";
import { FixedWindowLimiter } from "./rate-limit.js";
import { PostgresDatabase } from "../persistence/postgres.js";
import { getProduct, listPublishedProducts } from "../persistence/product-pg.js";
import { createOrder, getOrder, getOrderVersion, transitionPersistedOrder, upsertCustomer } from "../persistence/order-pg.js";
import { recordWebhookEvent, markWebhookProcessed } from "../persistence/webhook-pg.js";
import { quotePrice } from "../domain/pricing.js";
import type { PaymentProvider } from "../domain/providers.js";
import { createPaymentForOrder } from "../application/payment-service.js";
import { enqueueJob } from "../persistence/job-queue-pg.js";
import { verifyMercadoPagoSignature } from "../adapters/mercado-pago-webhook.js";
import { MercadoPagoCheckoutProProvider } from "../adapters/mercado-pago.js";

const checkoutSchema=z.object({
  lines:z.array(z.object({productId:z.string().uuid(),quantity:z.number().int().positive().max(99)})).min(1).max(50)
});
const orderSchema=checkoutSchema.extend({
  email:z.string().email().max(320),
  country:z.string().length(2),
  shippingAddress:z.record(z.string(),z.unknown()).default({})
});
const paymentEventSchema=z.object({
  type:z.enum(["payment.succeeded","payment.failed"]),
  orderId:z.string().uuid(),
  paymentId:z.string().min(1).max(200)
});

async function readBody(req:IncomingMessage,maxBytes=1_000_000){
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){
    const b=Buffer.from(chunk);size+=b.length;if(size>maxBytes)throw new Error("Request body too large");chunks.push(b);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function json(res:ServerResponse,status:number,body:unknown,id:string){
  res.statusCode=status;res.setHeader("content-type","application/json; charset=utf-8");res.setHeader("cache-control","no-store");res.setHeader("x-request-id",id);res.end(JSON.stringify(body));
}
function clientKey(req:IncomingMessage){return req.socket.remoteAddress??"unknown"}
function parseJson(text:string){try{return JSON.parse(text) as unknown}catch{throw new Error("Invalid JSON")}}

export function createCommerceServer(config:AppConfig,db:PostgresDatabase,deps:{paymentProvider?:PaymentProvider}={}){
  const limiter=new FixedWindowLimiter(120,60_000);
  return createServer(async(req,res)=>{
    const requestId=randomUUID();
    try{
      if(!limiter.allow(clientKey(req)))return json(res,429,{error:"Rate limit exceeded"},requestId);
      const url=new URL(req.url??"/","http://localhost");

      if(req.method==="GET"&&url.pathname==="/health")
        return json(res,200,{ok:true,service:"autonomous-ecommerce"},requestId);

      if(req.method==="GET"&&url.pathname==="/ready"){
        await db.query("SELECT 1");
        return json(res,200,{ok:true,dependencies:{postgres:true}},requestId);
      }

      if(req.method==="GET"&&url.pathname==="/api/products"){
        const limit=Number(url.searchParams.get("limit")??"24");
        const offset=Number(url.searchParams.get("offset")??"0");
        const products=await listPublishedProducts(db,limit,offset);
        return json(res,200,{items:products},requestId);
      }

      if(req.method==="GET"&&url.pathname.startsWith("/api/products/")){
        const id=url.pathname.slice("/api/products/".length);
        const p=await getProduct(db,id);
        if(!p||p.status!=="published")return json(res,404,{error:"Product not found"},requestId);
        const q=quotePrice({supplierCost:p.cost,shippingCost:p.shippingCost,feeRate:p.feeRate,targetMarginRate:p.targetMarginRate});
        return json(res,200,{product:{...p,price:q.price},pricing:{currency:p.currency,price:q.price}},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/api/quote"){
        const parsed=checkoutSchema.parse(parseJson(await readBody(req)));
        const lines=[] as Array<Record<string,unknown>>;let total=0;let margin=0;let currency:string|undefined;
        for(const line of parsed.lines){
          const p=await getProduct(db,line.productId);
          if(!p||p.status!=="published"||(p.stock-p.reservedStock)<line.quantity)throw new Error("Product unavailable: "+line.productId);
          if(currency&&currency!==p.currency)throw new Error("Mixed currencies are not supported in one quote");
          currency=p.currency;
          const q=quotePrice({supplierCost:p.cost,shippingCost:p.shippingCost,feeRate:p.feeRate,targetMarginRate:p.targetMarginRate});
          total+=q.price*line.quantity;margin+=q.grossMargin*line.quantity;
          lines.push({productId:p.id,title:p.title,quantity:line.quantity,unitPrice:q.price,subtotal:q.price*line.quantity});
        }
        return json(res,200,{currency,total,grossMarginRate:total?margin/total:0,lines},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/api/orders"){
        const idempotencyKey=req.headers["idempotency-key"];
        if(typeof idempotencyKey!=="string"||idempotencyKey.length<16||idempotencyKey.length>200)
          return json(res,400,{error:"Idempotency-Key header is required"},requestId);
        const raw=await readBody(req);\n        const requestHash=createHash("sha256").update(raw).digest("hex");\n        const parsed=orderSchema.parse(parseJson(raw));
        const grouped=[] as Array<{productId:string;externalId:string;title:string;quantity:number;unitPrice:number;unitCost:number;shippingCost:number}>;
        let subtotal=0;let currency:string|undefined;
        for(const line of parsed.lines){
          const p=await getProduct(db,line.productId);
          if(!p||p.status!=="published"||p.stock<line.quantity)throw new Error("Product unavailable: "+line.productId);
          if(currency&&currency!==p.currency)throw new Error("Mixed currencies are not supported in one order");
          currency=p.currency;
          const q=quotePrice({supplierCost:p.cost,shippingCost:p.shippingCost,feeRate:p.feeRate,targetMarginRate:p.targetMarginRate});
          subtotal+=q.price*line.quantity;
          grouped.push({productId:p.id,externalId:p.externalId,title:p.title,quantity:line.quantity,unitPrice:q.price,unitCost:p.cost,shippingCost:p.shippingCost});
        }
        const customerId=await upsertCustomer(db,parsed.email,parsed.country);
        if(!customerId)throw new Error("Customer creation failed");
        const order=await createOrder(db,{id:randomUUID(),currency:currency??"USD",subtotal,shipping:0,total:subtotal,idempotencyKey,requestHash,customerId,shippingAddress:parsed.shippingAddress,lines:grouped});
        return json(res,201,{order},requestId);
      }

      if(req.method==="POST"&&url.pathname.match(/^\\/api\\/orders\\/[^/]+\\/pay$/)){
        const idempotencyKey=req.headers["idempotency-key"];
        if(typeof idempotencyKey!=="string"||idempotencyKey.length<16||idempotencyKey.length>200)return json(res,400,{error:"Idempotency-Key header is required"},requestId);
        if(!deps.paymentProvider)return json(res,503,{error:"Payment provider is not configured"},requestId);
        const orderId=url.pathname.slice("/api/orders/".length,-"/pay".length);
        const payment=await createPaymentForOrder(db,deps.paymentProvider,orderId,idempotencyKey);
        return json(res,201,{payment},requestId);
      }

      if(req.method==="GET"&&url.pathname.startsWith("/api/orders/")){
        const orderId=url.pathname.slice("/api/orders/".length);const order=await getOrder(db,orderId);
        if(!order)return json(res,404,{error:"Order not found"},requestId);
        return json(res,200,{order:{id:order.id,status:order.status,currency:order.currency,total:order.total,items:order.items,createdAt:order.createdAt,updatedAt:order.updatedAt}},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/webhooks/mercadopago"){
        const raw=await readBody(req);
        const signature=req.headers["x-signature"];
        const mpRequestId=req.headers["x-request-id"];
        const dataId=url.searchParams.get("data.id")??undefined;
        if(typeof signature!=="string"||typeof mpRequestId!=="string"||!verifyMercadoPagoSignature({signature,requestId:mpRequestId,dataId,secret:config.MERCADO_PAGO_WEBHOOK_SECRET!})){
          return json(res,401,{error:"Invalid Mercado Pago signature"},requestId);
        }
        const eventId="mp:"+mpRequestId+":"+dataId;
        const accepted=await recordWebhookEvent(db,{eventId,provider:"mercado-pago",signatureValid:true,rawPayload:raw});
        if(!accepted)return json(res,200,{accepted:true,duplicate:true},requestId);
        await enqueueJob(db,{type:"payment.sync",payload:{provider:"mercado-pago",externalPaymentId:dataId,eventId}});
        return json(res,200,{accepted:true},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/webhooks/generic"){
        const raw=await readBody(req);const sig=req.headers["x-webhook-signature"],eventId=req.headers["x-webhook-event-id"],provider=req.headers["x-webhook-provider"]??"generic";
        if(typeof sig!=="string"||typeof eventId!=="string")return json(res,401,{error:"Invalid webhook"},requestId);
        if(!verifyHmac(raw,sig,config.WEBHOOK_SECRET))return json(res,401,{error:"Invalid webhook"},requestId);
        if(!(await recordWebhookEvent(db,{eventId,provider:String(provider),signatureValid:true,rawPayload:raw})))return json(res,202,{accepted:true,eventId,duplicate:true},requestId);
        const event=paymentEventSchema.parse(parseJson(raw));const current=await getOrderVersion(db,event.orderId);
        if(current){
          const target=event.type==="payment.succeeded"?"paid":"cancelled";
          await transitionPersistedOrder(db,event.orderId,target,current.version,event.paymentId);
          await markWebhookProcessed(db,eventId);
        }
        return json(res,202,{accepted:true,eventId},requestId);
      }

      if(req.method==="GET"&&url.pathname==="/admin/ping"){
        const key=req.headers["x-admin-api-key"];const principal=authenticateApiKey(typeof key==="string"?key:undefined,config.ADMIN_API_KEY);
        if(!principal)return json(res,401,{error:"Unauthorized"},requestId);
        return json(res,200,{ok:true,role:principal.role},requestId);
      }

      return json(res,404,{error:"Not found"},requestId);
    }catch(error){
      const status=error instanceof z.ZodError?400:500;
      return json(res,status,{error:error instanceof Error?error.message:"Internal error"},requestId);
    }
  });
}

export function startCommerceServer(config=loadConfig()){
  const db=new PostgresDatabase(config.DATABASE_URL);
  const paymentProvider=config.MERCADO_PAGO_ACCESS_TOKEN?new MercadoPagoCheckoutProProvider({accessToken:config.MERCADO_PAGO_ACCESS_TOKEN,successUrl:config.CHECKOUT_SUCCESS_URL!,failureUrl:config.CHECKOUT_FAILURE_URL!,pendingUrl:config.CHECKOUT_PENDING_URL!}):undefined;
  const server=createCommerceServer(config,db,{paymentProvider});
  server.listen(config.PORT);
  return {server,db};
}

if(process.env.NODE_ENV!=="test")startCommerceServer();
