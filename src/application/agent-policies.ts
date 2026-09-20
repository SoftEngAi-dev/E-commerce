import type { ActionContext } from "./risk-gate.js";
export interface AutonomousPolicy{allowLowMedium:boolean;requireEvidence:boolean;maxBudget:number;blockedActions:string[]}
export function evaluateAgentAction(policy:AutonomousPolicy,ctx:ActionContext){
  if(policy.blockedActions.includes(ctx.action))return{allowed:false,reason:"blocked-action"};
  if(policy.requireEvidence&&ctx.evidence.length===0)return{allowed:false,reason:"missing-evidence"};
  if(!policy.allowLowMedium&&ctx.risk!=="low")return{allowed:false,reason:"autonomy-disabled"};
  return{allowed:ctx.risk==="low"||ctx.risk==="medium",reason:"policy"};
}
