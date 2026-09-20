import type { PostgresDatabase } from "../persistence/postgres.js";
import { claimOutbox, markOutboxPublished } from "../persistence/outbox-pg.js";

export interface EventPublisher{publish(input:{topic:string;aggregateType:string;aggregateId:string;payload:Record<string,unknown>}):Promise<void>}

export async function publishOutboxBatch(db:PostgresDatabase,publisher:EventPublisher,limit=50){
  const events=await claimOutbox(db,limit);
  for(const event of events){
    await publisher.publish({topic:event.topic,aggregateType:event.aggregate_type,aggregateId:event.aggregate_id,payload:event.payload});
    await markOutboxPublished(db,event.id);
  }
  return events.length;
}
