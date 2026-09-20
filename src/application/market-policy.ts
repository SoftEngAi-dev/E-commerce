import type { PostgresDatabase } from "../persistence/postgres.js";

export interface MarketPolicy{
  market:string;
  currency:string;
  enabled:boolean;
  allowedChannels:string[];
  blockedCategories:string[];
}

export async function getMarketPolicy(db:PostgresDatabase,market:string){
  const r=await db.query<{market:string;currency:string;enabled:boolean;allowed_channels:string[];blocked_categories:string[]}>(
    "SELECT market,currency,enabled,allowed_channels AS allowed_channels,blocked_categories AS blocked_categories FROM market_policies WHERE market=$1",
    [market.toUpperCase()]
  );
  const p=r.rows[0];if(!p)return;
  return{market:p.market,currency:p.currency,enabled:p.enabled,allowedChannels:p.allowed_channels??[],blockedCategories:p.blocked_categories??[]};
}

export function isCategoryAllowed(policy:MarketPolicy,category:string){return !policy.blockedCategories.includes(category)}
export function isChannelAllowedForMarket(policy:MarketPolicy,channel:string){return policy.enabled&&policy.allowedChannels.includes(channel)}
