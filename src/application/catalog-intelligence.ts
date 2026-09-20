import type { PostgresDatabase } from "../persistence/postgres.js";
import { upsertProduct } from "../persistence/postgres.js";
import { scoreProduct, type ProductSignals } from "./product-intelligence.js";
import { checkCompliance, type SupplierPolicy } from "./compliance.js";
import type { NormalizedProduct } from "../domain/providers.js";

export interface CatalogCandidate{
  product:NormalizedProduct;
  market:string;
  channel:"store"|"marketplace"|"social";
  claims:string[];
  signals:ProductSignals;
  supplierPolicy:SupplierPolicy;
}

export async function ingestCatalogCandidate(db:PostgresDatabase,input:CatalogCandidate){
  const score=scoreProduct(input.signals);
  const compliance=checkCompliance({policy:input.supplierPolicy,market:input.market,claims:input.claims,channel:input.channel});
  await upsertProduct(db,input.product);
  const productRow=await db.query<{id:string}>("SELECT id FROM products WHERE source=$1 AND external_id=$2",[input.product.source,input.product.externalId]);
  const productId=productRow.rows[0]?.id;
  if(!productId)throw new Error("Catalog product was not persisted");

  await db.query(
    `INSERT INTO product_signals(product_id,demand,margin,competition,supplier_score,shipping_score,risk_score,trend,composite_score,decision)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(product_id) DO UPDATE SET demand=EXCLUDED.demand,margin=EXCLUDED.margin,competition=EXCLUDED.competition,supplier_score=EXCLUDED.supplier_score,shipping_score=EXCLUDED.shipping_score,risk_score=EXCLUDED.risk_score,trend=EXCLUDED.trend,composite_score=EXCLUDED.composite_score,decision=EXCLUDED.decision,updated_at=now()`,
    [productId,input.signals.demand,input.signals.margin,input.signals.competition,input.signals.supplier,input.signals.shipping,input.signals.risk,input.signals.trend,score.score,score.decision]
  );

  await db.query(
    `INSERT INTO compliance_checks(product_id,market,channel,allowed,reasons,policy_snapshot)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(product_id,market,channel) DO UPDATE SET allowed=EXCLUDED.allowed,reasons=EXCLUDED.reasons,policy_snapshot=EXCLUDED.policy_snapshot,checked_at=now()`,
    [productId,input.market.toUpperCase(),input.channel,compliance.allowed,compliance.reasons,input.supplierPolicy]
  );

  return {productId,score,compliance,market:input.market,channel:input.channel,category:input.product.category};
}
