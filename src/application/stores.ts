import type { PostgresDatabase } from "../persistence/postgres.js";

export interface StoreDefinition{
  slug:string;
  name:string;
  defaultMarket:string;
  defaultCurrency:string;
}

export async function createStore(db:PostgresDatabase,input:StoreDefinition){
  const r=await db.query<{id:string}>(
    "INSERT INTO stores(slug,name,default_market,default_currency) VALUES($1,$2,$3,$4) RETURNING id",
    [input.slug,input.name,input.defaultMarket.toUpperCase(),input.defaultCurrency.toUpperCase()]
  );
  return r.rows[0]?.id;
}

export async function attachProductToStore(db:PostgresDatabase,storeId:string,productId:string){
  await db.query("INSERT INTO store_products(store_id,product_id) VALUES($1,$2) ON CONFLICT(store_id,product_id) DO UPDATE SET enabled=true",[storeId,productId]);
}

export async function enableStoreMarket(db:PostgresDatabase,input:{storeId:string;market:string;currency:string;channel?:string}){
  await db.query(
    "INSERT INTO store_markets(store_id,market,currency,enabled,channel) VALUES($1,$2,$3,true,$4) ON CONFLICT(store_id,market,channel) DO UPDATE SET currency=EXCLUDED.currency,enabled=true",
    [input.storeId,input.market.toUpperCase(),input.currency.toUpperCase(),input.channel??"store"]
  );
}
