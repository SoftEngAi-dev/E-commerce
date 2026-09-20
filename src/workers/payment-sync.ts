import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { PostgresDatabase } from "../persistence/postgres.js";
import { Worker } from "../application/worker.js";
import { syncExternalPayment } from "../application/payment-sync.js";
import { markWebhookProcessed } from "../persistence/webhook-pg.js";
import { enqueueJob } from "../persistence/job-queue-pg.js";
import { MercadoPagoCheckoutProProvider } from "../adapters/mercado-pago.js";

export async function runPaymentWorker(){
  const config=loadConfig();
  if(!config.MERCADO_PAGO_ACCESS_TOKEN||!config.MERCADO_PAGO_WEBHOOK_SECRET)
    throw new Error("Mercado Pago credentials are required for the payment worker");

  const db=new PostgresDatabase(config.DATABASE_URL);
  const provider=new MercadoPagoCheckoutProProvider({
    accessToken:config.MERCADO_PAGO_ACCESS_TOKEN,
    successUrl:config.CHECKOUT_SUCCESS_URL!,
    failureUrl:config.CHECKOUT_FAILURE_URL!,
    pendingUrl:config.CHECKOUT_PENDING_URL!
  });

  const worker=new Worker(db,"payment-"+randomUUID(),new Map([
    ["payment.sync",async job=>{
      const payload=job.payload as {externalPaymentId?:string;eventId?:string};
      if(!payload.externalPaymentId||!payload.eventId)throw new Error("Invalid payment.sync payload");
      const result=await syncExternalPayment(db,provider,payload.externalPaymentId);
      await markWebhookProcessed(db,payload.eventId);
      if(result.status==="paid"&&config.FULFILLMENT_BASE_URL&&config.FULFILLMENT_TOKEN){
        await enqueueJob(db,{type:"order.fulfillment",payload:{orderId:result.orderId,idempotencyKey:"fulfill-"+result.orderId}});
      }
    }
  ]));

  try{await worker.runOnce(10)}finally{await db.close()}
}

if(process.env.NODE_ENV!=="test")runPaymentWorker().catch(error=>{console.error(error);process.exitCode=1});
