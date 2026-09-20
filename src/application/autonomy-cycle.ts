import type{AIOrchestrator,AgentResult,AgentTask}from"./orchestrator.js";
export interface Observation{source:string;data:Record<string,unknown>;evidence:string[]}
export interface Proposal{task:AgentTask;reason:string}
export class AutonomyCycle{
 constructor(private orchestrator:AIOrchestrator){}
 async evaluate(observation:Observation):Promise<Proposal>{
  if(observation.evidence.length===0)throw new Error("Observation has no evidence");
  return{reason:"evidence-backed observation",task:{type:observation.source,input:observation.data,risk:"medium",evidence:observation.evidence}};
 }
 async execute(proposal:Proposal):Promise<{status:"executed"|"approval_required";result?:AgentResult}>{
  const r=await this.orchestrator.run(proposal.task);
  return r.status==="executed"?{status:"executed",result:r.result}:{status:"approval_required"};
 }
}
