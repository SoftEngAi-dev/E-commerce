import type { PostgresDatabase } from "../persistence/postgres.js";
import type { AIProvider } from "../ai/provider.js";
import { runAgent } from "../ai/agent-runtime.js";
import { saveAiDraft } from "./support.js";

export async function draftSupportReply(
  db:PostgresDatabase,
  provider:AIProvider,
  ticket:{id:string;subject:string;message:string;orderId?:string},
){
  const result=await runAgent(db,provider,{
    agent:"support",
    system:"You are a customer support assistant. Draft a concise factual reply. Do not promise refunds, shipping outcomes, policy exceptions or legal conclusions. Escalate sensitive cases.",
    prompt:"Draft a support reply for subject: "+ticket.subject+"\nMessage: "+ticket.message+"\nOrder: "+(ticket.orderId??"unknown"),
    memoryQuery:"support tone common resolutions",
    knowledgeQuery:"support policies returns shipping refunds",
    temperature:0
  });
  await saveAiDraft(db,ticket.id,{text:result.output,model:result.model});
  return result;
}
