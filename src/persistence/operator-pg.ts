import type { PostgresDatabase } from "./postgres.js";
import { hashSessionToken } from "../security/session.js";

export interface OperatorRecord{id:string;email:string;role:"operator"|"admin";enabled:boolean}

export async function findOperatorByEmail(db:PostgresDatabase,email:string){
  const r=await db.query<OperatorRecord&{passwordHash:string}>(
    'SELECT id,email,password_hash AS "passwordHash",role,enabled FROM operators WHERE lower(email)=lower($1)',
    [email]
  );
  return r.rows[0];
}

export async function createOperator(db:PostgresDatabase,input:{email:string;passwordHash:string;role?:"operator"|"admin"}){
  const r=await db.query<{id:string}>(
    "INSERT INTO operators(email,password_hash,role) VALUES($1,$2,$3) RETURNING id",
    [input.email.toLowerCase(),input.passwordHash,input.role??"operator"]
  );
  return r.rows[0]?.id;
}

export async function createSession(db:PostgresDatabase,operatorId:string,token:string,ttlSeconds:number){
  const hash=hashSessionToken(token);
  const r=await db.query<{id:string}>(
    "INSERT INTO operator_sessions(operator_id,token_hash,expires_at) VALUES($1,$2,now()+($3::bigint*interval '1 second')) RETURNING id",
    [operatorId,hash,ttlSeconds]
  );
  return r.rows[0]?.id;
}

export async function findOperatorBySession(db:PostgresDatabase,token:string){
  const hash=hashSessionToken(token);
  const r=await db.query<OperatorRecord>(
    'SELECT o.id,o.email,o.role,o.enabled FROM operator_sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()',
    [hash]
  );
  return r.rows[0];
}

export async function revokeSession(db:PostgresDatabase,token:string){
  await db.query("UPDATE operator_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL",[hashSessionToken(token)]);
}
