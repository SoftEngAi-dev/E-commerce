export type Risk="low"|"medium"|"high"|"critical";
export interface AgentTask{type:string;input:Record<string,unknown>;risk:Risk;evidence:string[]}
export interface AgentResult{type:string;output:Record<string,unknown>;actions:string[]}
export interface Agent{readonly id:string;run(task:AgentTask):Promise<AgentResult>}
const rank:Record<Risk,number>={low:0,medium:1,high:2,critical:3};
export class AIOrchestrator{
  constructor(private readonly agents:Map<string,Agent>){}
  async run(task:AgentTask){
    if(task.evidence.length===0)throw new Error("Agent task requires evidence");
    if(rank[task.risk]>=2)return{status:"approval_required" as const,task};
    const agent=this.agents.get(task.type);if(!agent)throw new Error("No agent registered for "+task.type);
    return{status:"executed" as const,result:await agent.run(task)};
  }
}
