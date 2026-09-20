import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { PostgresDatabase } from "../persistence/postgres.js";
import { Worker } from "../application/worker.js";
import { createFulfillmentWorker } from "../application/fulfillment-worker.js";
import { HttpFulfillmentProvider } from "../adapters/http-fulfillment.js";

export async function runFulfillmentWorker(){
  const config=loadConfig();
  if(!config.FULFILLMENT_BASE_URL||!config.FULFILLMENT_TOKEN)throw new Error("FULFILLMENT_BASE_URL and FULFILLMENT_TOKEN are required");
  const db=new PostgresDatabase(config.DATABASE_URL);
  const provider=new HttpFulfillmentProvider({baseUrl:config.FULFILLMENT_BASE_URL,token:config.FULFILLMENT_TOKEN});
  const worker=createFulfillmentWorker(db,provider);
  try{await worker.runOnce(10)}finally{await db.close()}
}

if(process.env.NODE_ENV!=="test")runFulfillmentWorker().catch(error=>{console.error(error);process.exitCode=1});
