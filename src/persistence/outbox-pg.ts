import type { PostgresDatabase } from "./postgres.js";
export async function appendOutbox(db:PostgresDatabase,event:{topic:string;aggregateType:string;aggregateId:string;payload:Record<string,unknown>}){await db.query("INSERT INTO outbox_events(topic,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)",[event.topic,event.aggregateType,event.aggregateId,event.payload])}
export async function claimOutbox(db:PostgresDatabase,workerId:string,limit=50){
  const r=await db.query<{id:string;topic:string;aggregate_type:string;aggregate_id:string;payload:Record<string,unknown>}>(
    `WITH picked AS (
      SELECT id FROM outbox_events WHERE published_at IS NULL AND (claimed_at IS NULL OR claimed_at<now()-interval '5 minutes')
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1
    )
    UPDATE outbox_events o SET claimed_at=now(),claimed_by=$2,attempt_count=attempt_count+1
    FROM picked WHERE o.id=picked.id RETURNING o.id,o.topic,o.aggregate_type,o.aggregate_id,o.payload`,
    [limit,workerId]
  );
  return r.rows;
}
export async function markOutboxPublished(db:PostgresDatabase,id:string,workerId:string){await db.query("UPDATE outbox_events SET published_at=now(),claimed_at=NULL,claimed_by=NULL WHERE id=$1 AND published_at IS NULL AND claimed_by=$2",[id,workerId])}
export async function releaseOutboxClaim(db:PostgresDatabase,id:string,workerId:string){await db.query("UPDATE outbox_events SET claimed_at=NULL,claimed_by=NULL WHERE id=$1 AND published_at IS NULL AND claimed_by=$2",[id,workerId])}
