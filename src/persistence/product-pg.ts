import type { PostgresDatabase } from "./postgres.js";
import type { NormalizedProduct } from "../domain/providers.js";

export interface ProductRecord extends NormalizedProduct {
  id:string; shippingCost:number; feeRate:number; targetMarginRate:number; status:string; publishedAt?:Date; reservedStock:number; imageUrls:string[];
}

function toNumber(value:number|string){return Number(value)}

export async function listPublishedProducts(db:PostgresDatabase,limit=50,offset=0,storeSlug?:string):Promise<ProductRecord[]>{
  const safeLimit=Math.min(Math.max(1,Math.trunc(limit)),100);
  const safeOffset=Math.max(0,Math.trunc(offset));
  const sqlBase='SELECT p.id,p.external_id AS "externalId",p.source,p.title,p.description,p.currency,p.cost,p.stock,p.reserved_stock AS "reservedStock",p.shipping_cost AS "shippingCost",p.fee_rate AS "feeRate",p.target_margin_rate AS "targetMarginRate",p.image_urls AS "imageUrls",p.category,p.status,p.published_at AS "publishedAt" FROM products p';
  const where=" WHERE p.status='published' AND p.stock-p.reserved_stock>0 AND p.published_at IS NOT NULL";
  const params:unknown[]=[];
  let sql=sqlBase;
  if(storeSlug){
    sql+=' JOIN store_products sp ON sp.product_id=p.id JOIN stores s ON s.id=sp.store_id';
    params.push(storeSlug);
    sql+=where+" AND sp.enabled=true AND s.enabled=true AND s.slug=$1";
  }else{sql+=where}
  params.push(safeLimit,safeOffset);
  sql+=' ORDER BY p.published_at DESC LIMIT $'+(params.length-1)+' OFFSET $'+params.length;
  const r=await db.query<ProductRecord>(sql,params);
  return r.rows.map(p=>({...p,cost:toNumber(p.cost),shippingCost:toNumber(p.shippingCost),feeRate:toNumber(p.feeRate),targetMarginRate:toNumber(p.targetMarginRate),reservedStock:toNumber(p.reservedStock),imageUrls:Array.isArray(p.imageUrls)?p.imageUrls:[]}));
}

export async function getProduct(db:PostgresDatabase,id:string,storeSlug?:string):Promise<ProductRecord|undefined>{
  const params:unknown[]=[id];
  let sql='SELECT p.id,p.external_id AS "externalId",p.source,p.title,p.description,p.currency,p.cost,p.stock,p.reserved_stock AS "reservedStock",p.shipping_cost AS "shippingCost",p.fee_rate AS "feeRate",p.target_margin_rate AS "targetMarginRate",p.image_urls AS "imageUrls",p.category,p.status,p.published_at AS "publishedAt" FROM products p';
  if(storeSlug){
    params.push(storeSlug);
    sql+=' JOIN store_products sp ON sp.product_id=p.id JOIN stores s ON s.id=sp.store_id AND sp.enabled=true AND s.enabled=true';
  }
  sql+=' WHERE p.id=$1'+(storeSlug?' AND s.slug=$2':"");
  const r=await db.query<ProductRecord>(sql,params);
  const p=r.rows[0];if(!p)return;
  return {...p,cost:toNumber(p.cost),shippingCost:toNumber(p.shippingCost),feeRate:toNumber(p.feeRate),targetMarginRate:toNumber(p.targetMarginRate),reservedStock:toNumber(p.reservedStock),imageUrls:Array.isArray(p.imageUrls)?p.imageUrls:[]};
}
