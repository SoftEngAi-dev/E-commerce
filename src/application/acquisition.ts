import type { AcquisitionChannel } from "../domain/suppliers.js";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { saveAcquisitionPublication } from "../persistence/connectors-pg.js";

export async function publishThroughChannel(db:PostgresDatabase,channel:AcquisitionChannel,input:{productId:string;title:string;description:string;price:number;currency:string;metadata?:Record<string,unknown>}){
  const result=await channel.publish(input);
  await saveAcquisitionPublication(db,{
    productId:input.productId,
    channel:channel.id,
    externalId:result.externalId,
    url:result.url,
    metadata:input.metadata
  });
  await db.query(
    "INSERT INTO outbox_events(topic,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)",
    ["acquisition.published","product",input.productId,JSON.stringify({channel:channel.id,externalId:result.externalId,url:result.url??null})]
  );
  return result;
}

export async function pauseThroughChannel(db:PostgresDatabase,channel:AcquisitionChannel,externalId:string){
  await channel.pause(externalId);
  await db.query("UPDATE acquisition_publications SET status='paused' WHERE channel=$1 AND external_id=$2",[channel.id,externalId]);
}
