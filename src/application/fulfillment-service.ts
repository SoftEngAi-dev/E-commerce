import type { FulfillmentProvider } from "../domain/providers.js";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { getOrder } from "../persistence/order-pg.js";
import { transitionPersistedOrder } from "../persistence/order-pg.js";
import { enqueueJob } from "../persistence/job-queue-pg.js";

export async function submitPaidOrder(
  db:PostgresDatabase,
  provider:FulfillmentProvider,
  orderId:string,
  idempotencyKey:string
){
  const order=await getOrder(db,orderId);
  if(!order)throw new Error("Order not found");
  if(order.status!=="paid")throw new Error("Order must be paid before fulfillment");

  const address=order.shippingAddress;
  const addressText=JSON.stringify(address);
  const items=order.items.map(item=>({sku:String(item.externalId),quantity:Number(item.quantity)}));
  const fulfillment=await provider.submit({orderId,items,address:addressText,idempotencyKey});

  await db.query(
    "INSERT INTO fulfillment_attempts(order_id,provider,external_id,status,idempotency_key,request_payload,response_payload) VALUES($1,$2,$3,'submitted',$4,$5,$6) ON CONFLICT(provider,idempotency_key) DO UPDATE SET external_id=EXCLUDED.external_id,status='submitted',response_payload=EXCLUDED.response_payload,updated_at=now()",
    [orderId,provider.id,fulfillment.externalId,idempotencyKey,{items,address},{externalId:fulfillment.externalId}]
  );

  const current=await db.query<{version:number}>("SELECT version FROM orders WHERE id=$1",[orderId]);
  const version=current.rows[0]?.version;
  if(version===undefined)throw new Error("Order version not found");
  const transitioned=await transitionPersistedOrder(db,orderId,"submitted",version,undefined,fulfillment.externalId);\n  await enqueueJob(db,{type:"fulfillment.tracking.sync",payload:{externalFulfillmentId:fulfillment.externalId},maxAttempts:20,availableAt:new Date(Date.now()+60000)});\n  return transitioned;
}
