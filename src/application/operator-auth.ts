import type { PostgresDatabase } from "../persistence/postgres.js";
import { createSession, findOperatorByEmail, findOperatorBySession, revokeSession } from "../persistence/operator-pg.js";
import { verifyPassword } from "../security/password.js";
import { createSessionToken } from "../security/session.js";

export async function loginOperator(db:PostgresDatabase,email:string,password:string,ttlSeconds=28800){
  const operator=await findOperatorByEmail(db,email);
  if(!operator||!operator.enabled||!(await verifyPassword(password,operator.passwordHash)))throw new Error("Invalid credentials");
  const token=createSessionToken();
  await createSession(db,operator.id,token,ttlSeconds);
  return{token,operator:{id:operator.id,email:operator.email,role:operator.role}};
}

export async function resolveOperatorSession(db:PostgresDatabase,token:string){
  if(!token)return;
  return findOperatorBySession(db,token);
}

export async function logoutOperator(db:PostgresDatabase,token:string){
  if(token)await revokeSession(db,token);
}
