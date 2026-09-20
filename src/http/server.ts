import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { loadConfig, type AppConfig } from "../config.js";
import { authenticateApiKey } from "../security/admin-auth.js";
import { verifyHmac } from "../security/hmac.js";
import { FixedWindowLimiter } from "./rate-limit.js";
import { PostgresDatabase } from "../persistence/postgres.js";
import { getProduct, listPublishedProducts } from "../persistence/product-pg.js";
import { ingestCatalogCandidate } from "../application/catalog-intelligence.js";
import { getOperationalSummary, getProductPerformance } from "../application/analytics.js";
import { getMarketPolicy, isCategoryAllowed, isChannelAllowedForMarket } from "../application/market-policy.js";
import { PostgresAuditSink } from "../persistence/audit-pg.js";
import { getStoreBySlug } from "../persistence/store-pg.js";
import { reviewWithAI } from "../application/ai-review.js";
import { createOrder, getOrder, getOrderVersion, transitionPersistedOrder, upsertCustomer } from "../persistence/order-pg.js";
import { recordWebhookEvent, markWebhookProcessed } from "../persistence/webhook-pg.js";
import { quotePrice } from "../domain/pricing.js";
import { priceCart } from "../application/pricing-service.js";
import { HttpTaxProvider } from "../adapters/http-tax.js";
import type { PaymentProvider } from "../domain/providers.js";
import { createPaymentForOrder } from "../application/payment-service.js";
import { enqueueJob } from "../persistence/job-queue-pg.js";
import { verifyMercadoPagoSignature } from "../adapters/mercado-pago-webhook.js";
import { MercadoPagoCheckoutProProvider } from "../adapters/mercado-pago.js";

const checkoutSchema=z.object({
  lines:z.array(z.object({productId:z.string().uuid(),quantity:z.number().int().positive().max(99)})).min(1).max(50)
});
const quoteSchema=checkoutSchema.extend({storeSlug:z.string().min(1).max(100).optional(),country:z.string().length(2).optional(),postalCode:z.string().max(20).optional()});
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
    const buffer=Buffer.from(chunk);size+=buffer.length;
    if(size>maxBytes)throw new Error("Request body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function applyCors(req:IncomingMessage,res:ServerResponse,origins:string){
  const origin=req.headers.origin;
  const allowed=origins.split(",").map(x=>x.trim()).filter(Boolean);
  if(origin&&allowed.includes(origin)){res.setHeader("access-control-allow-origin",origin);res.setHeader("vary","Origin");res.setHeader("access-control-allow-credentials","true")}
}
function json(res:ServerResponse,status:number,body:unknown,id:string){
  res.statusCode=status;
  res.setHeader("content-type","application/json; charset=utf-8");
  res.setHeader("cache-control","no-store");
  res.setHeader("x-request-id",id);
  res.end(JSON.stringify(body));
}
function clientKey(req:IncomingMessage){return req.socket.remoteAddress??"unknown"}
function parseJson(text:string){try{return JSON.parse(text) as unknown}catch{throw new Error("Invalid JSON")}}
function serviceAuthenticated(req:IncomingMessage,config:AppConfig){const key=req.headers["x-internal-service-key"];return authenticateApiKey(typeof key==="string"?key:undefined,config.INTERNAL_SERVICE_KEY)!==null}

export function createCommerceServer(config:AppConfig,db:PostgresDatabase,deps:{paymentProvider?:PaymentProvider;taxProvider?:HttpTaxProvider}={}){
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
        const storeSlug=url.searchParams.get("store")??undefined;
        const products=await listPublishedProducts(db,limit,offset,storeSlug??undefined);
        return json(res,200,{items:products},requestId);
      }

      if(req.method==="GET"&&url.pathname.startsWith("/api/products/")){
        const id=url.pathname.slice("/api/products/".length);
        const storeSlug=url.searchParams.get("store")??undefined;
        const product=await getProduct(db,id,storeSlug??undefined);
        if(!product||product.status!=="published")return json(res,404,{error:"Product not found"},requestId);
        const pricing=quotePrice({supplierCost:product.cost,shippingCost:product.shippingCost,feeRate:product.feeRate,targetMarginRate:product.targetMarginRate});
        return json(res,200,{product:{...product,price:pricing.price},pricing:{currency:product.currency,price:pricing.price}},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/api/quote"){
        const parsed=quoteSchema.parse(parseJson(await readBody(req)));
        const priced=await priceCart(db,parsed.lines,{storeSlug:parsed.storeSlug,country:parsed.country,postalCode:parsed.postalCode,taxProvider:deps.taxProvider});
        return json(res,200,{currency:priced.currency,subtotal:priced.subtotal,tax:priced.tax,total:priced.total,taxRate:priced.taxRate,taxJurisdiction:priced.taxJurisdiction,grossMarginRate:priced.grossMarginRate,lines:priced.lines},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/api/orders"){
        const idempotencyKey=req.headers["idempotency-key"];
        if(typeof idempotencyKey!=="string"||idempotencyKey.length<16||idempotencyKey.length>200)
          return json(res,400,{error:"Idempotency-Key header is required"},requestId);
        const raw=await readBody(req);
        const requestHash=createHash("sha256").update(raw).digest("hex");
        const parsed=orderSchema.parse(parseJson(raw));

        const store=parsed.storeSlug?await getStoreBySlug(db,parsed.storeSlug):undefined;
        if(parsed.storeSlug&&(!store||!store.enabled))return json(res,409,{error:"Store is not enabled"},requestId);

        const postalCode=typeof parsed.shippingAddress.postalCode==="string"?parsed.shippingAddress.postalCode:undefined;
        const priced=await priceCart(db,parsed.lines,{storeSlug:parsed.storeSlug,country:parsed.country,postalCode,taxProvider:deps.taxProvider});
        const byId=new Map(priced.products.map(product=>[product.id,product]));
        const grouped=priced.lines.map(line=>{
          const product=byId.get(line.productId);
          if(!product)throw new Error("Priced product disappeared");
          return {productId:product.id,externalId:product.externalId,title:product.title,quantity:line.quantity,unitPrice:line.unitPrice,unitCost:product.cost,shippingCost:product.shippingCost};
        });

        const customerId=await upsertCustomer(db,parsed.email,parsed.country);
        if(!customerId)throw new Error("Customer creation failed");
        const order=await createOrder(db,{
          id:randomUUID(),storeId:store?.id,currency:priced.currency,subtotal:priced.subtotal,shipping:0,
          taxAmount:priced.tax,taxProvider:deps.taxProvider?.id,total:priced.total,
          pricingSnapshot:{currency:priced.currency,subtotal:priced.subtotal,tax:priced.tax,taxRate:priced.taxRate,taxJurisdiction:priced.taxJurisdiction,lines:priced.lines},
          idempotencyKey,requestHash,customerId,shippingAddress:parsed.shippingAddress,lines:grouped
        });
        return json(res,201,{order},requestId);
      }

      if(req.method==="POST"&&url.pathname.startsWith("/api/orders/")&&url.pathname.endsWith("/pay")){
        const idempotencyKey=req.headers["idempotency-key"];
        if(typeof idempotencyKey!=="string"||idempotencyKey.length<16||idempotencyKey.length>200)
          return json(res,400,{error:"Idempotency-Key header is required"},requestId);
        if(!deps.paymentProvider)return json(res,503,{error:"Payment provider is not configured"},requestId);
        const orderId=url.pathname.slice("/api/orders/".length,-"/pay".length);
        const payment=await createPaymentForOrder(db,deps.paymentProvider,orderId,idempotencyKey);
        return json(res,201,{payment},requestId);
      }

      if(req.method==="GET"&&url.pathname.startsWith("/api/orders/")){
        const orderId=url.pathname.slice("/api/orders/".length);
        const order=await getOrder(db,orderId);
        if(!order)return json(res,404,{error:"Order not found"},requestId);
        return json(res,200,{order:{id:order.id,status:order.status,currency:order.currency,total:order.total,items:order.items,createdAt:order.createdAt,updatedAt:order.updatedAt}},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/webhooks/mercadopago"){
        const raw=await readBody(req);
        const signature=req.headers["x-signature"];
        const mpRequestId=req.headers["x-request-id"];
        const dataId=url.searchParams.get("data.id")??undefined;
        const secret=config.MERCADO_PAGO_WEBHOOK_SECRET;
        if(typeof signature!=="string"||typeof mpRequestId!=="string"||!secret||
          !verifyMercadoPagoSignature({signature,requestId:mpRequestId,dataId,secret}))
          return json(res,401,{error:"Invalid Mercado Pago signature"},requestId);
        const eventId="mp:"+mpRequestId+":"+String(dataId);
        const accepted=await recordWebhookEvent(db,{eventId,provider:"mercado-pago",signatureValid:true,rawPayload:raw});
        if(!accepted)return json(res,200,{accepted:true,duplicate:true},requestId);
        await enqueueJob(db,{type:"payment.sync",payload:{provider:"mercado-pago",externalPaymentId:dataId,eventId}});
        return json(res,200,{accepted:true},requestId);
      }

      if(req.method==="POST"&&url.pathname==="/webhooks/generic"){
        const raw=await readBody(req);
        const signature=req.headers["x-webhook-signature"];
        const eventId=req.headers["x-webhook-event-id"];
        const provider=req.headers["x-webhook-provider"]??"generic";
        if(typeof signature!=="string"||typeof eventId!=="string"||!verifyHmac(raw,signature,config.WEBHOOK_SECRET))
          return json(res,401,{error:"Invalid webhook"},requestId);
        if(!(await recordWebhookEvent(db,{eventId,provider:String(provider),signatureValid:true,rawPayload:raw})))
          return json(res,202,{accepted:true,eventId,duplicate:true},requestId);
        const event=paymentEventSchema.parse(parseJson(raw));
        const current=await getOrderVersion(db,event.orderId);
        if(current){
          const target=event.type==="payment.succeeded"?"paid":"cancelled";
          await transitionPersistedOrder(db,event.orderId,target,current.version,event.paymentId);
          await markWebhookProcessed(db,eventId);
        }
        return json(res,202,{accepted:true,eventId},requestId);
      }

      if(url.pathname.startsWith("/internal/")){
        if(!serviceAuthenticated(req,config))return json(res,401,{error:"Unauthorized"},requestId);

        if(req.method==="GET"&&url.pathname==="/internal/analytics/summary")
          return json(res,200,{summary:await getOperationalSummary(db)},requestId);

        if(req.method==="GET"&&url.pathname==="/internal/analytics/products"){
          const limit=Number(url.searchParams.get("limit")??"50");
          return json(res,200,{items:await getProductPerformance(db,limit)},requestId);
        }

        if(req.method==="POST"&&url.pathname==="/internal/ai/review"){
          if(!config.AI_BASE_URL||!config.AI_MODEL)return json(res,503,{error:"AI provider is not configured"},requestId);
          const input=z.object({metrics:z.record(z.string(),z.unknown()),agent:z.string().max(100).optional()}).parse(parseJson(await readBody(req)));
          const review=await reviewWithAI(db,input,{id:config.AI_PROVIDER_ID,baseUrl:config.AI_BASE_URL,model:config.AI_MODEL,token:config.AI_TOKEN});
          return json(res,200,review,requestId);
        }

        if(req.method==="POST"&&url.pathname==="/internal/catalog/ingest"){
          const raw=parseJson(await readBody(req));
          const candidate=z.object({
            product:z.object({
              externalId:z.string().min(1),
              title:z.string().min(1).max(500),
              currency:z.string().length(3),
              cost:z.number().nonnegative(),
              stock:z.number().int().nonnegative(),
              imageUrls:z.array(z.string().url()).default([]),
              source:z.string().min(1),
              description:z.string().optional(),
              category:z.string().optional()
            }),
            market:z.string().length(2),
            channel:z.enum(["store","marketplace","social"]),
            claims:z.array(z.string()).default([]),
            supplierPolicy:z.object({dropshippingAllowed:z.boolean().optional(),marketplaceAllowed:z.boolean().optional(),adModificationAllowed:z.boolean().optional(),internationalSalesAllowed:z.boolean().optional(),restrictedTerritories:z.array(z.string()).optional()}).default({}),
            signals:z.object({
              demand:z.number().min(0).max(100),
              margin:z.number().min(0).max(100),
              competition:z.number().min(0).max(100),
              supplier:z.number().min(0).max(100),
              shipping:z.number().min(0).max(100),
              risk:z.number().min(0).max(100),
              trend:z.number().min(0).max(100)
            })
          }).parse(raw);
          const result=await ingestCatalogCandidate(db,candidate);
          return json(res,202,{accepted:true,result},requestId);
        }

        if(req.method==="POST"&&url.pathname==="/internal/catalog/candidates"){
          const body=z.object({
            productId:z.string().uuid(),
            market:z.string().length(2),
            channel:z.enum(["store","marketplace","social"]),
            category:z.string().optional()
          }).parse(parseJson(await readBody(req)));
          const policy=await getMarketPolicy(db,body.market);
          if(!policy||!isChannelAllowedForMarket(policy,body.channel))return json(res,409,{error:"Market/channel policy does not allow publication"},requestId);
          if(body.category&&!isCategoryAllowed(policy,body.category))return json(res,409,{error:"Category blocked for market"},requestId);
          const signal=await db.query<{decision:string;score:number}>("SELECT decision,composite_score AS score FROM product_signals WHERE product_id=$1",[body.productId]);
          const row=signal.rows[0];
          if(!row||row.decision!=="test")return json(res,409,{error:"Product is not an eligible publication candidate"},requestId);
          const updated=await db.query<{id:string}>(
            "UPDATE products SET status='published',published_at=now(),updated_at=now() WHERE id=$1 AND status<>'published' RETURNING id",
            [body.productId]
          );
          const audit=new PostgresAuditSink(db);
          await audit.write({actor:"n8n",action:"catalog.publish",entityType:"product",entityId:body.productId,risk:"medium",evidence:["product-intelligence","market-policy"],metadata:{score:row.score,market:body.market,channel:body.channel,status:updated.rowCount===1?"published":"already-published"},createdAt:new Date()});
          return json(res,200,{published:true,productId:body.productId,score:Number(row.score)},requestId);
        }

        if(req.method==="POST"&&url.pathname==="/internal/audit/events"){
          const event=z.object({
            actor:z.string().min(1).max(100),
            action:z.string().min(1).max(200),
            entityType:z.string().min(1).max(100),
            entityId:z.string().max(200).optional(),
            risk:z.enum(["low","medium","high","critical"]),
            evidence:z.array(z.string()).default([]),
            metadata:z.record(z.string(),z.unknown()).default({})
          }).parse(parseJson(await readBody(req)));
          await new PostgresAuditSink(db).write({...event,createdAt:new Date()});
          return json(res,202,{accepted:true},requestId);
        }

        return json(res,404,{error:"Internal route not found"},requestId);
      }

      if(req.method==="GET"&&url.pathname==="/admin/ping"){
        const key=req.headers["x-admin-api-key"];
        const principal=authenticateApiKey(typeof key==="string"?key:undefined,config.ADMIN_API_KEY);
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
  const taxProvider=config.TAX_BASE_URL&&config.TAX_TOKEN?new HttpTaxProvider(config.TAX_BASE_URL,config.TAX_TOKEN):undefined;
  const paymentProvider=config.MERCADO_PAGO_ACCESS_TOKEN
    ?new MercadoPagoCheckoutProProvider({
      accessToken:config.MERCADO_PAGO_ACCESS_TOKEN,
      successUrl:config.CHECKOUT_SUCCESS_URL!,
      failureUrl:config.CHECKOUT_FAILURE_URL!,
      pendingUrl:config.CHECKOUT_PENDING_URL!
    })
    :undefined;
  const server=createCommerceServer(config,db,{paymentProvider,taxProvider});
  server.listen(config.PORT);
  return {server,db};
}

if(process.env.NODE_ENV!=="test")startCommerceServer();
