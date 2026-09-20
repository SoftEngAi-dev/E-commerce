export interface ProductSignals{ demand:number; margin:number; competition:number; supplier:number; shipping:number; risk:number; trend:number }
export interface ProductScore{ score:number; decision:"test"|"review"|"reject"; reasons:string[] }
function clamp(n:number){return Math.max(0,Math.min(100,n))}
export function scoreProduct(s:ProductSignals):ProductScore{
  const score=clamp(.22*s.demand+.22*s.margin+.12*s.supplier+.12*s.trend+.12*(100-s.competition)+.10*(100-s.shipping)+.10*(100-s.risk));
  const reasons:string[]=[];
  if(s.demand<50)reasons.push("low-demand-signal");
  if(s.margin<50)reasons.push("weak-margin");
  if(s.risk>60)reasons.push("high-risk");
  if(s.shipping>70)reasons.push("shipping-friction");
  const decision=score>=75&&s.risk<60?"test":score>=55?"review":"reject";
  return{score,decision,reasons}
}
