import { randomUUID } from "node:crypto";
import type { PostgresDatabase } from "../persistence/postgres.js";
import type { FulfillmentProvider } from "../domain/providers.js";
import { Worker } from "./worker.js";
import { submitPaidOrder } from "./fulfillment-service.js";

export function createFulfillmentWorker(db:PostgresDatabase,provider:FulfillmentProvider){
  return new Worker(db,"fulfillment-"+randomUUID(),new Map([
    ["order.fulfillment",async job=>{
      const p=job.payload as {orderId?:string;idempotencyKey?:string};
      if(!p.orderId||!p.idempotencyKey)throw new Error("Invalid order.fulfillment payload");
      await submitPaidOrder(db,provider,p.orderId,p.idempotencyKey);
    }]
  ]));
}
