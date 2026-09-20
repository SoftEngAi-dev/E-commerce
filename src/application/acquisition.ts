import type { AcquisitionChannel } from "../domain/suppliers.js";
import type { PostgresDatabase } from "../persistence/postgres.js";

export async function publishThroughChannel(db:PostgresDatabase,channel:AcquisitionChannel,input:{productId:string;title:string;description:string;price:number;currency:string;metadata?:Record<string,unknown>}){
  const result=await channel.publish(input);
  await db.query(
    "INSERT INTO outbox_events(topic,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)",
    ["acquisition.published","product",input.productId,JSON.stringify({channel:channel.id,externalId:result.externalId,url:result.url??null})]
  );
  return result;
}
