import type{PostgresDatabase}from"./postgres.js";
export interface PersistedJob{id:string;type:string;payload:unknown;attempts:number;maxAttempts:number;status:string;workerId?:string}
export async function claimJobs(db:PostgresDatabase,workerId:string,limit=10){const r=await db.query<PersistedJob>(
"WITH picked AS (SELECT id FROM jobs WHERE status='queued' AND available_at<=now() ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT $1) UPDATE jobs j SET status='running',attempts=j.attempts+1,locked_at=now(),worker_id=$2 FROM picked WHERE j.id=picked.id RETURNING j.id,j.type,j.payload,j.attempts,j.max_attempts AS "maxAttempts",j.status,j.worker_id AS "workerId"",
[limit,workerId]);return r.rows}
export async function completeJob(db:PostgresDatabase,id:string,workerId:string){await db.query("UPDATE jobs SET status='completed',locked_at=NULL,worker_id=NULL WHERE id=$1 AND status='running' AND worker_id=$2",[id,workerId])}
export async function failJob(db:PostgresDatabase,id:string,workerId:string,error:string,retryDelayMs:number){await db.query(
"UPDATE jobs SET status=CASE WHEN attempts>=max_attempts THEN 'dead' ELSE 'queued' END,last_error=$3,available_at=CASE WHEN attempts>=max_attempts THEN available_at ELSE now()+($4::bigint*interval '1 millisecond') END,locked_at=NULL,worker_id=NULL WHERE id=$1 AND status='running' AND worker_id=$2",
[id,workerId,error,retryDelayMs])}
