import type { ActionContext } from "./risk-gate.js";
import { canExecute } from "./risk-gate.js";
import type { AuditSink } from "./audit.js";

export interface AutonomousAction{
  context:ActionContext;
  execute:()=>Promise<Record<string,unknown>>;
}

export async function runAutonomousAction(
  action:AutonomousAction,
  policy:{allowLowMedium:boolean;requireEvidence:boolean;maxBudget?:number;blockedActions?:string[]},
  audit:AuditSink
){
  if(!canExecute(action.context,policy)){
    await audit.write({actor:"ai-orchestrator",action:action.context.action,entityType:"autonomous-action",risk:action.context.risk,evidence:action.context.evidence,metadata:{status:"approval_required"},createdAt:new Date()});
    return{status:"approval_required" as const};
  }
  const output=await action.execute();
  await audit.write({actor:"ai-orchestrator",action:action.context.action,entityType:"autonomous-action",risk:action.context.risk,evidence:action.context.evidence,metadata:{status:"executed",output},createdAt:new Date()});
  return{status:"executed" as const,output};
}
