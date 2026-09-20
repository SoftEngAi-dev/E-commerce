import {createHmac,timingSafeEqual} from "node:crypto";
export function signHmac(payload:string,secret:string){return createHmac("sha256",secret).update(payload).digest("hex")}
export function verifyHmac(payload:string,signature:string,secret:string){const a=Buffer.from(signHmac(payload,secret));const b=Buffer.from(signature);return a.length===b.length&&timingSafeEqual(a,b)}
export class ReplayGuard{private seen=new Map<string,number>();constructor(private ttlMs=300000){}accept(id:string,now=Date.now()){for(const [k,v] of this.seen)if(v<=now)this.seen.delete(k);if(!id||this.seen.has(id))return false;this.seen.set(id,now+this.ttlMs);return true}}
