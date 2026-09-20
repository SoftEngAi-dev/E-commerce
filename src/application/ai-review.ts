import { z } from "zod";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { OpenAICompatibleAIProvider } from "../ai/provider.js";
import { runAgent } from "../ai/agent-runtime.js";
import { requiresApproval } from "./risk-gate.js";

const proposalSchema=z.object({action:z.string().min(1).max(200),risk:z.enum(["low","medium","high","critical"]),evidence:z.array(z.string()).min(1),reason:z.string().min(1).max(2000)});
function extractJson(text:string){const fenced=text.match(/```json\\s*([\\s\\S]*?)\\s*```/i);return JSON.parse(fenced?fenced[1]:text)}

export async function reviewWithAI(db:PostgresDatabase,input:{metrics:Record<string,unknown>;agent?:string;system?:string},config:{id:string;baseUrl:string;model:string;token?:string}){
  const provider=new OpenAICompatibleAIProvider({id:config.id,baseUrl:config.baseUrl,model:config.model,token:config.token});
  const result=await runAgent(db,provider,{agent:input.agent??"analytics",system:input.system??"You are an e-commerce operations analyst. Propose one evidence-backed action. Never claim an action was executed. Return only JSON with action, risk, evidence, reason.",prompt:"Review these operational metrics and propose the single highest-value safe next action. Metrics: "+JSON.stringify(input.metrics),memoryQuery:"commerce operations metrics actions outcomes",knowledgeQuery:"commerce operations policies risk",temperature:0});
  let proposal;try{proposal=proposalSchema.parse(extractJson(result.output))}catch{return{status:"approval_required" as const,reason:"ai-output-not-parseable",raw:result.output,model:result.model}}
  const status=requiresApproval({action:proposal.action,risk:proposal.risk,evidence:proposal.evidence})?"approval_required":"proposed";
  await db.query("INSERT INTO agent_runs(agent,task_type,risk,status,evidence,output) VALUES($1,$2,$3,$4,$5,$6)",[input.agent??"analytics","operations.review",proposal.risk,status,proposal.evidence,JSON.stringify({proposal,model:result.model})]);
  return{status,proposal,model:result.model};
}
