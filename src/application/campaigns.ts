import type { PostgresDatabase } from "../persistence/postgres.js";
import type { ActionContext } from "./../application/risk-gate.js";

export interface CampaignDraft{name:string;market:string;channel:string;budget:number;currency:string;policy:Record<string,unknown>}
export function validateCampaignBudget(budget:number){if(!Number.isFinite(budget)||budget<0)throw new Error("Invalid campaign budget")}
export function campaignRisk(draft:CampaignDraft):ActionContext{
  validateCampaignBudget(draft.budget);
  const risk:draft["budget"] extends never ? never : "low"|"medium"|"high" = draft.budget>1000?"high":draft.budget>250?"medium":"low";
  return{action:"campaign.create",risk,evidence:["budget-policy","market-policy","channel-policy"]};
}
export async function createCampaign(db:PostgresDatabase,draft:CampaignDraft){
  validateCampaignBudget(draft.budget);
  const r=await db.query<{id:string}>(
    "INSERT INTO campaigns(name,market,channel,budget,currency,policy,status) VALUES($1,$2,$3,$4,$5,$6,'draft') RETURNING id",
    [draft.name,draft.market,draft.channel,draft.budget,draft.currency,draft.policy]
  );
  return r.rows[0]?.id;
}
