import type { PostgresDatabase } from "./postgres.js";

export async function getStoreBySlug(db:PostgresDatabase,slug:string){
  const r=await db.query<{id:string;slug:string;name:string;default_market:string;default_currency:string;enabled:boolean}>(
    "SELECT id,slug,name,default_market,default_currency,enabled FROM stores WHERE slug=$1",
    [slug]
  );
  return r.rows[0];
}

export async function listStoreMarkets(db:PostgresDatabase,storeId:string){
  const r=await db.query<{market:string;currency:string;enabled:boolean;channel:string}>(
    "SELECT market,currency,enabled,channel FROM store_markets WHERE store_id=$1 ORDER BY market,channel",
    [storeId]
  );
  return r.rows;
}
