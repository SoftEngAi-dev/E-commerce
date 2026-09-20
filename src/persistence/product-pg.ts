import type { PostgresDatabase } from "./postgres.js";
import type { NormalizedProduct } from "../domain/providers.js";

export interface ProductRecord extends NormalizedProduct {
  id:string;
  shippingCost:number;
  feeRate:number;
  targetMarginRate:number;
  status:string;
  publishedAt?:Date;
  imageUrls:string[];
}

function toNumber(value:number|string){return Number(value)}

export async function listPublishedProducts(db:PostgresDatabase,limit=50,offset=0):Promise<ProductRecord[]>{
  const safeLimit=Math.min(Math.max(1,Math.trunc(limit)),100);
  const safeOffset=Math.max(0,Math.trunc(offset));
  const r=await db.query<ProductRecord>(
    'SELECT id,external_id AS "externalId",source,title,description,currency,cost,stock,shipping_cost AS "shippingCost",fee_rate AS "feeRate",target_margin_rate AS "targetMarginRate",image_urls AS "imageUrls",category,status,published_at AS "publishedAt" FROM products WHERE status=\'published\' AND stock>0 AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1 OFFSET $2',
    [safeLimit,safeOffset]
  );
  return r.rows.map(p=>({...p,cost:toNumber(p.cost),shippingCost:toNumber(p.shippingCost),feeRate:toNumber(p.feeRate),targetMarginRate:toNumber(p.targetMarginRate),imageUrls:Array.isArray(p.imageUrls)?p.imageUrls:[]}));
}

export async function getProduct(db:PostgresDatabase,id:string):Promise<ProductRecord|undefined>{
  const r=await db.query<ProductRecord>(
    'SELECT id,external_id AS "externalId",source,title,description,currency,cost,stock,shipping_cost AS "shippingCost",fee_rate AS "feeRate",target_margin_rate AS "targetMarginRate",image_urls AS "imageUrls",category,status,published_at AS "publishedAt" FROM products WHERE id=$1',
    [id]
  );
  const p=r.rows[0];if(!p)return;
  return {...p,cost:toNumber(p.cost),shippingCost:toNumber(p.shippingCost),feeRate:toNumber(p.feeRate),targetMarginRate:toNumber(p.targetMarginRate),imageUrls:Array.isArray(p.imageUrls)?p.imageUrls:[]};
}
