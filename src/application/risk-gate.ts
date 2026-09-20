export type ActionRisk="low"|"medium"|"high"|"critical";
export interface ActionContext{action:string;risk:ActionRisk;evidence:string[];budget?:number}
const rank:Record<ActionRisk,number>={low:0,medium:1,high:2,critical:3};
export function requiresApproval(ctx:ActionContext){return rank[ctx.risk]>=rank.high}
export function canExecute(ctx:ActionContext,policy:{allowLowMedium:boolean;requireEvidence:boolean;maxBudget?:number;blockedActions?:string[]}){
  if(policy.blockedActions?.includes(ctx.action))return false;
  if(policy.requireEvidence&&ctx.evidence.length===0)return false;
  if(ctx.budget!==undefined&&policy.maxBudget!==undefined&&ctx.budget>policy.maxBudget)return false;
  if(!policy.allowLowMedium&&rank[ctx.risk]>rank.low)return false;
  return !requiresApproval(ctx);
}
export function assertExecutable(ctx:ActionContext,policy:{allowLowMedium:boolean;requireEvidence:boolean;maxBudget?:number;blockedActions?:string[]}){if(!canExecute(ctx,policy))throw new Error("Action requires approval or violates policy");}
