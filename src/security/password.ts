import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt=promisify(scryptCallback);

export async function hashPassword(password:string){
  if(password.length<12)throw new Error("Password must be at least 12 characters");
  const salt=randomBytes(16).toString("hex");
  const derived=await scrypt(password,salt,64) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password:string,stored:string){
  const parts=stored.split("$");
  if(parts.length!==3||parts[0]!=="scrypt")return false;
  const derived=await scrypt(password,parts[1],64) as Buffer;
  const expected=Buffer.from(parts[2],"hex");
  return expected.length===derived.length&&timingSafeEqual(expected,derived);
}
