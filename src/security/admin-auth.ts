import {createHash,timingSafeEqual} from "node:crypto";
export type Role="viewer"|"operator"|"admin";
export interface Principal{role:Role;actorId:string}
const rank:Record<Role,number>={viewer:0,operator:1,admin:2};
export function authenticateApiKey(supplied:string|undefined,expected:string,actorId="api-key"):Principal|null{if(!supplied)return null;const a=createHash("sha256").update(supplied).digest(),b=createHash("sha256").update(expected).digest();return timingSafeEqual(a,b)?{role:"admin",actorId}:null}
export function requireRole(p:Principal|null,required:Role){if(!p||rank[p.role]<rank[required])throw new Error("Forbidden");return p}
