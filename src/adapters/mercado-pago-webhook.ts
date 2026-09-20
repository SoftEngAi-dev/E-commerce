import { createHmac, timingSafeEqual } from "node:crypto";

function value(signature:string,name:string){
  const part=signature.split(",").find(x=>x.trim().startsWith(name+"="));
  return part?.slice(part.indexOf("=")+1).trim();
}

export function verifyMercadoPagoSignature(input:{
  signature:string|undefined;
  requestId:string|undefined;
  dataId:string|undefined;
  secret:string;
}){
  if(!input.signature||!input.requestId||!input.dataId)return false;
  const ts=value(input.signature,"ts");
  const v1=value(input.signature,"v1");
  if(!ts||!v1)return false;
  const manifest="id:"+input.dataId+";request-id:"+input.requestId+";ts:"+ts+";";
  const expected=createHmac("sha256",input.secret).update(manifest).digest("hex");
  const a=Buffer.from(expected);const b=Buffer.from(v1);
  return a.length===b.length&&timingSafeEqual(a,b);
}
