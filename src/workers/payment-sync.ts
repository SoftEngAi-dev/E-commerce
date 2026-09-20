import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { PostgresDatabase } from "../persistence/postgres.js";
import { Worker } from "../application/worker.js";
import { syncExternalPayment } from "../application/payment-sync.js";
import { markWebhookProcessed } from "../persistence/webhook-pg.js";
import { MercadoPagoCheckoutProProvider } from "../adapters/mercado-pago.js";

export async function runPaymentWorker(){
  const config=loadConfig();
  if(!config.MERCADO_PAGO_ACCESS_TOKEN)throw new Error("MERCADO_PAGO_ACCESS_TOKEN is required for the payment worker");
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
      await syncExternalPayment(db,provider,payload.externalPaymentId);
      await markWebhookProcessed(db,payload.eventId);
    }]
  ]));
  try{
    await worker.runOnce(10);
  }finally{
    await db.close();
  }
}

if(process.env.NODE_ENV!=="test")runPaymentWorker().catch(error=>{console.error(error);process.exitCode=1});
