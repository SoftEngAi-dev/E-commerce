import type { PostgresDatabase } from "./postgres.js";

export async function listPendingAgentRuns(db:PostgresDatabase,limit=20){
  const r=await db.query<{
    id:string;agent:string;task_type:string;risk:string;status:string;evidence:string[];output:Record<string,unknown>|null;created_at:Date
  }>(
    "SELECT id,agent,task_type,risk,status,evidence,output,created_at FROM agent_runs WHERE status='approval_required' ORDER BY created_at DESC LIMIT $1",
    [Math.min(Math.max(1,Math.trunc(limit)),50)]
  );
  return r.rows;
}
