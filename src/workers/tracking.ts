import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { PostgresDatabase } from "../persistence/postgres.js";
import { Worker } from "../application/worker.js";
import { HttpFulfillmentProvider } from "../adapters/http-fulfillment.js";
import { syncFulfillmentTracking } from "../application/tracking-service.js";

export async function runTrackingWorker(){
  const config=loadConfig();
  if(!config.FULFILLMENT_BASE_URL||!config.FULFILLMENT_TOKEN)throw new Error("Fulfillment configuration is required");
  const db=new PostgresDatabase(config.DATABASE_URL);
  const provider=new HttpFulfillmentProvider({baseUrl:config.FULFILLMENT_BASE_URL,token:config.FULFILLMENT_TOKEN});
  const worker=new Worker(db,"tracking-"+randomUUID(),new Map([
    ["fulfillment.tracking.sync",async job=>{
      const payload=job.payload as{externalFulfillmentId?:string};
      if(!payload.externalFulfillmentId)throw new Error("Invalid tracking job payload");
      await syncFulfillmentTracking(db,provider,payload.externalFulfillmentId);
    }]
  ]));
  try{await worker.runOnce(10)}finally{await db.close()}
}
if(process.env.NODE_ENV!=="test")runTrackingWorker().catch(error=>{console.error(error);process.exitCode=1});
