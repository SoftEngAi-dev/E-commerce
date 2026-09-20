import type { PostgresDatabase } from "../persistence/postgres.js";
import { isActionRegistered } from "../ai/agent-catalog.js";

interface AgentRunOutput{proposal?:{action?:string;risk?:string;evidence?:string[];reason?:string}}

export async function approveAgentRun(db:PostgresDatabase,id:string,actor:string){
  const current=await db.query<{output:AgentRunOutput|null;risk:string;status:string}>(
    "SELECT output,risk,status FROM agent_runs WHERE id=$1",[id]
  );
  const row=current.rows[0];
  if(!row||row.status!=="approval_required")throw new Error("Agent run not found or not pending approval");
  const action=row.output?.proposal?.action;
  if(!action||!isActionRegistered(action))throw new Error("Action is not registered for autonomous execution");

  const r=await db.query<{id:string;status:string}>(
    "UPDATE agent_runs SET status='approved' WHERE id=$1 AND status='approval_required' RETURNING id,status",
    [id]
  );
  if(!r.rows[0])throw new Error("Agent run approval conflict");

  await db.query(
    "INSERT INTO audit_events(actor,action,entity_type,entity_id,risk,evidence,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now())",
    [actor,"agent.approve","agent-run",id,row.risk,[],{status:"approved",action}]
  );
  return r.rows[0];
}

export async function rejectAgentRun(db:PostgresDatabase,id:string,actor:string,reason:string){
  if(!reason.trim())throw new Error("Rejection reason is required");
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
