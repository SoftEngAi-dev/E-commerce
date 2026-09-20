import type { PostgresDatabase } from "../persistence/postgres.js";
import { claimOutbox,markOutboxPublished,releaseOutboxClaim } from "../persistence/outbox-pg.js";

export interface EventPublisher{publish(input:{topic:string;aggregateType:string;aggregateId:string;payload:Record<string,unknown>}):Promise<void>}

export async function publishOutboxBatch(db:PostgresDatabase,publisher:EventPublisher,workerId:string,limit=50){
  const events=await claimOutbox(db,workerId,limit);let published=0;
  for(const event){
    try{
      await publisher.publish({topic:event.topic,aggregateType:event.aggregate_type,aggregateId:event.aggregate_id,payload:event.payload});
      await markOutboxPublished(db,event.id,workerId);published++;
    }catch(error){
      await releaseOutboxClaim(db,event.id,workerId);throw error;
    }
  }
  return published;
}
