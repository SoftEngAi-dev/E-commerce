import type { PostgresDatabase } from "./postgres.js";

export async function approveAgentRun(db:PostgresDatabase,id:string,actor:string){
  const r=await db.query<{id:string;status:string}>(
    "UPDATE agent_runs SET status='approved' WHERE id=$1 AND status='approval_required' RETURNING id,status",
    [id]
  );
  if(!r.rows[0])throw new Error("Agent run not found or not pending approval");
  await db.query(
    "INSERT INTO audit_events(actor,action,entity_type,entity_id,risk,evidence,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())",
    [actor,"agent.approve","agent-run",id,"high",[],{status:"approved"}]
  );
  return r.rows[0];
}

export async function rejectAgentRun(db:PostgresDatabase,id:string,actor:string,reason:string){
  const r=await db.query<{id:string;status:string}>(
    "UPDATE agent_runs SET status='rejected' WHERE id=$1 AND status='approval_required' RETURNING id,status",
    [id]
  );
  if(!r.rows[0])throw new Error("Agent run not found or not pending approval");
  await db.query(
    "INSERT INTO audit_events(actor,action,entity_type,entity_id,risk,evidence,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())",
    [actor,"agent.reject","agent-run",id,"high",[],{status:"rejected",reason}]
  );
  return r.rows[0];
}
