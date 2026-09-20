import type { PostgresDatabase } from "../persistence/postgres.js";

export async function recordAcquisitionEvent(db:PostgresDatabase,input:{storeId?:string;productId?:string;channel:string;eventType:string;sessionId?:string;externalEventId?:string;value?:number;currency?:string;metadata?:Record<string,unknown>}){
  const r=await db.query<{id:string}>(
    "INSERT INTO acquisition_events(store_id,product_id,channel,event_type,session_id,external_event_id,value,currency,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(channel,external_event_id) DO NOTHING RETURNING id",
    [input.storeId??null,input.productId??null,input.channel,input.eventType,input.sessionId??null,input.externalEventId??null,input.value??null,input.currency??null,input.metadata??{}]
  );
  return r.rows[0]?.id;
}

export async function getChannelPerformance(db:PostgresDatabase,storeId?:string){
  const values:unknown[]=[];let where="";
  if(storeId){values.push(storeId);where="WHERE store_id=$1";}
  const r=await db.query<{channel:string;event_type:string;events:number;value:number}>(
    `SELECT channel,event_type,COUNT(*)::int AS events,COALESCE(SUM(value),0)::numeric AS value
     FROM acquisition_events ${where}
     GROUP BY channel,event_type ORDER BY channel,event_type`,values
  );
  return r.rows.map(row=>({...row,value:Number(row.value)}));
}
