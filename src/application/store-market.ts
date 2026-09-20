import type { PostgresDatabase } from "../persistence/postgres.js";
import { getStoreBySlug,listStoreMarkets } from "../persistence/store-pg.js";

export async function getStoreContext(db:PostgresDatabase,slug:string){
  const store=await getStoreBySlug(db,slug);
  if(!store||!store.enabled)throw new Error("Store not found or disabled");
  const markets=await listStoreMarkets(db,store.id);
  return{store,markets};
}

export function canOperateStoreMarket(input:{storeEnabled:boolean;marketEnabled:boolean;channel:string;allowedChannels:string[]}){
  return input.storeEnabled&&input.marketEnabled&&input.allowedChannels.includes(input.channel);
}
