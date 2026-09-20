import { createHash } from "node:crypto";
import type { PostgresDatabase } from "./postgres.js";

export async function recordWebhookEvent(
  db:PostgresDatabase,
  input:{eventId:string;provider:string;signatureValid:boolean;rawPayload:string}
):Promise<boolean>{
  const hash=createHash("sha256").update(input.rawPayload).digest("hex");
  const r=await db.query(
    "INSERT INTO webhook_events(event_id,provider,signature_valid,payload_hash) VALUES($1,$2,$3,$4) ON CONFLICT(event_id) DO NOTHING RETURNING event_id",
    [input.eventId,input.provider,input.signatureValid,hash]
  );
  return r.rowCount===1;
}

export async function markWebhookProcessed(db:PostgresDatabase,eventId:string){
  await db.query("UPDATE webhook_events SET processed_at=now() WHERE event_id=$1",[eventId]);
}
