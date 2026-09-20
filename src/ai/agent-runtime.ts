import type { PostgresDatabase } from "../persistence/postgres.js";
import type { AIProvider } from "./provider.js";
import { searchKnowledge,searchMemory } from "../persistence/memory-pg.js";

export interface AgentRuntimeInput{agent:string;system:string;prompt:string;memoryQuery?:string;knowledgeQuery?:string;temperature?:number}

export async function runAgent(db:PostgresDatabase,provider:AIProvider,input:AgentRuntimeInput){
  const memory=input.memoryQuery?await searchMemory(db,{agent:input.agent,query:input.memoryQuery,limit:6}):[];
  const knowledge=input.knowledgeQuery?await searchKnowledge(db,{query:input.knowledgeQuery,limit:6}):[];
  const context=[
    ...memory.map(x=>"[MEMORY] "+x.content),
    ...knowledge.map(x=>"[KNOWLEDGE] "+x.title+"\n"+x.content)
  ].join("\n\n");
  const prompt=context?input.prompt+"\n\nRelevant context:\n"+context:input.prompt;
  return provider.complete({system:input.system,prompt,temperature:input.temperature});
}
