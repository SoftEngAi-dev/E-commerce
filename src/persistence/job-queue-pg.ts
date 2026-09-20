import type { PostgresDatabase } from "./postgres.js";
export interface PersistedJob {id:string;type:string;payload:unknown;attempts:number;maxAttempts:number;status:string;workerId?:string}

export async function enqueueJob(db:PostgresDatabase,input:{type:string;payload:unknown;maxAttempts?:number;availableAt?:Date}){
  const r=await db.query<{id:string}>("INSERT INTO jobs(type,payload,status,max_attempts,available_at) VALUES($1,$2,'queued',$3,$4) RETURNING id",[input.type,input.payload,input.maxAttempts??5,input.availableAt??new Date()]);
  return r.rows[0]?.id;
}

export async function recoverStaleJobs(db:PostgresDatabase,staleMs=300000){
  const r=await db.query<{id:string}>("UPDATE jobs SET status='queued',locked_at=NULL,worker_id=NULL,available_at=now() WHERE status='running' AND locked_at<now()-($1::bigint*interval '1 millisecond') RETURNING id",[staleMs]);
  return r.rowCount;
}

export async function claimJobs(db:PostgresDatabase,workerId:string,limit=10){
  const sql=`WITH picked AS (SELECT id FROM jobs WHERE status='queued' AND available_at<=now() ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT $1)
  UPDATE jobs j SET status='running',attempts=j.attempts+1,locked_at=now(),worker_id=$2 FROM picked WHERE j.id=picked.id
  RETURNING j.id,j.type,j.payload,j.attempts,j.max_attempts AS "maxAttempts",j.status,j.worker_id AS "workerId"`;
  const r=await db.query<PersistedJob>(sql,[limit,workerId]);return r.rows;
}

export async function completeJob(db:PostgresDatabase,id:string,workerId:string){
  await db.query("UPDATE jobs SET status='completed',locked_at=NULL,worker_id=NULL WHERE id=$1 AND status='running' AND worker_id=$2",[id,workerId]);
}

export async function failJob(db:PostgresDatabase,id:string,workerId:string,error:string,retryDelayMs:number){
  const sql=`UPDATE jobs SET status=CASE WHEN attempts>=max_attempts THEN 'dead' ELSE 'queued' END,last_error=$3,
    available_at=CASE WHEN attempts>=max_attempts THEN available_at ELSE now()+($4::bigint*interval '1 millisecond') END,
    locked_at=NULL,worker_id=NULL WHERE id=$1 AND status='running' AND worker_id=$2`;
  await db.query(sql,[id,workerId,error,retryDelayMs]);
}
