import type { PostgresDatabase } from "../persistence/postgres.js";

export async function createSupportTicket(db:PostgresDatabase,input:{customerId?:string;orderId?:string;subject:string;message:string;priority?:"low"|"normal"|"high"}){
  const r=await db.query<{id:string}>(
    "INSERT INTO support_tickets(customer_id,order_id,subject,message,priority) VALUES($1,$2,$3,$4,$5) RETURNING id",
    [input.customerId??null,input.orderId??null,input.subject,input.message,input.priority??"normal"]
  );
  return r.rows[0]?.id;
}

export async function saveAiDraft(db:PostgresDatabase,ticketId:string,draft:Record<string,unknown>){
  await db.query("UPDATE support_tickets SET ai_draft=$2,updated_at=now() WHERE id=$1",[ticketId,draft]);
}
