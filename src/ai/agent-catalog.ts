import type { AgentTask } from "../application/orchestrator.js";
import type { ActionRisk } from "../application/risk-gate.js";

export interface AgentDefinition{
  id:string;
  purpose:string;
  defaultRisk:ActionRisk;
  allowedActions:string[];
  systemPrompt:string;
}

const common="Use only supplied evidence. Do not invent facts, permissions, prices, availability or policy decisions. Return structured outputs when requested.";

export const AGENT_CATALOG:AgentDefinition[]=[
  {id:"research",purpose:"supplier, product and market research",defaultRisk:"low",allowedActions:["research.collect","research.summarize"],systemPrompt:common+" You are the research agent. Separate observed facts from inferences."},
  {id:"product",purpose:"normalize, enrich and score catalog products",defaultRisk:"medium",allowedActions:["catalog.enrich","catalog.score"],systemPrompt:common+" You are the product intelligence agent."},
  {id:"pricing",purpose:"analyze margins and pricing recommendations",defaultRisk:"medium",allowedActions:["pricing.propose"],systemPrompt:common+" You are the pricing agent. Never override server-side pricing rules."},
  {id:"content",purpose:"SEO, descriptions and merchandising copy",defaultRisk:"low",allowedActions:["content.draft","content.optimize"],systemPrompt:common+" You are the SEO/content agent. Avoid unsupported claims."},
  {id:"marketing",purpose:"campaign concepts and channel content",defaultRisk:"medium",allowedActions:["campaign.propose","content.ad.draft"],systemPrompt:common+" You are the marketing agent. Treat ad spend and publication as gated actions."},
  {id:"sales",purpose:"sales analysis and offer recommendations",defaultRisk:"medium",allowedActions:["sales.analyze","offer.propose"],systemPrompt:common+" You are the sales agent."},
  {id:"support",purpose:"customer support triage and response drafts",defaultRisk:"low",allowedActions:["support.classify","support.draft"],systemPrompt:common+" You are the support agent. Escalate refunds, legal threats and sensitive cases."},
  {id:"analytics",purpose:"metrics, experiments and anomaly analysis",defaultRisk:"low",allowedActions:["analytics.review","analytics.alert"],systemPrompt:common+" You are the analytics agent."},
  {id:"optimization",purpose:"cross-system optimization proposals",defaultRisk:"medium",allowedActions:["optimization.propose"],systemPrompt:common+" You are the optimization agent. Prefer reversible experiments."},
  {id:"orchestrator",purpose:"coordinate agents and enforce policy",defaultRisk:"high",allowedActions:["agent.route","agent.schedule"],systemPrompt:common+" You are the orchestrator. Do not bypass risk gates."}
];

export function getAgentDefinition(id:string){
  const agent=AGENT_CATALOG.find(item=>item.id===id);
  if(!agent)throw new Error("Unknown agent: "+id);
  return agent;
}

export function taskForAgent(agentId:string,input:Record<string,unknown>,evidence:string[]):AgentTask{
  const agent=getAgentDefinition(agentId);
  return{type:agent.id,input,risk:agent.defaultRisk,evidence};
}
