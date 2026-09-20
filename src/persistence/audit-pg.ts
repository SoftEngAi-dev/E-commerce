import type { PostgresDatabase } from "./postgres.js";
import type { AuditEvent } from "../application/audit.js";

export async function writeAuditEvent(db:PostgresDatabase,event:AuditEvent){
  await db.query(
    "INSERT INTO audit_events(actor,action,entity_type,entity_id,risk,evidence,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [event.actor,event.action,event.entityType,event.entityId??null,event.risk,event.evidence,event.metadata,event.createdAt]
  );
}

export class PostgresAuditSink {
  constructor(private readonly db:PostgresDatabase){}
  async write(event:AuditEvent){await writeAuditEvent(this.db,event)}
}
