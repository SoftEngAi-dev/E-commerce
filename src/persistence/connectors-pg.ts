import type { PostgresDatabase } from "./postgres.js";

export async function registerSupplierConnection(db:PostgresDatabase,input:{supplierId:string;market:string;channel:string;policySnapshot:Record<string,unknown>;metadata?:Record<string,unknown>}){
  const r=await db.query<{id:string}>(
    "INSERT INTO supplier_connections(supplier_id,market,channel,policy_snapshot,metadata) VALUES($1,$2,$3,$4,$5) ON CONFLICT(supplier_id,market,channel) DO UPDATE SET status='active',policy_snapshot=EXCLUDED.policy_snapshot,metadata=EXCLUDED.metadata,updated_at=now() RETURNING id",
    [input.supplierId,input.market.toUpperCase(),input.channel,input.policySnapshot,input.metadata??{}]
  );
  return r.rows[0]?.id;
}

export async function saveAcquisitionPublication(db:PostgresDatabase,input:{productId:string;channel:string;externalId:string;url?:string;metadata?:Record<string,unknown>}){
  const r=await db.query<{id:string}>(
    "INSERT INTO acquisition_publications(product_id,channel,external_id,url,metadata) VALUES($1,$2,$3,$4,$5) ON CONFLICT(channel,external_id) DO UPDATE SET url=EXCLUDED.url,metadata=EXCLUDED.metadata,status='published' RETURNING id",
    [input.productId,input.channel,input.externalId,input.url??null,input.metadata??{}]
  );
  return r.rows[0]?.id;
}

export async function pauseAcquisitionPublication(db:PostgresDatabase,channel:string,externalId:string){
  await db.query("UPDATE acquisition_publications SET status='paused' WHERE channel=$1 AND external_id=$2",[channel,externalId]);
}

export async function listActiveSupplierConnections(db:PostgresDatabase){
  const r=await db.query<{id:string;supplierId:string;market:string;channel:string;status:string;policySnapshot:Record<string,unknown>;metadata:Record<string,unknown>;updatedAt:Date}>(
    'SELECT id,supplier_id AS "supplierId",market,channel,status,policy_snapshot AS "policySnapshot",metadata,updated_at AS "updatedAt" FROM supplier_connections WHERE status=\'active\' ORDER BY updated_at DESC'
  );
  return r.rows;
}
