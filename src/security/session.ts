import { createHash, randomBytes } from "node:crypto";

export function createSessionToken(){return randomBytes(32).toString("base64url")}
export function hashSessionToken(token:string){return createHash("sha256").update(token).digest("hex")}
export function sessionCookie(token:string,maxAgeSeconds:number,secure:boolean){
  return `commerce_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0,Math.trunc(maxAgeSeconds))}${secure?"; Secure":""}`;
}
