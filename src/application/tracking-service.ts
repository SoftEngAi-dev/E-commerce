import type { FulfillmentProvider } from "../domain/providers.js";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { findOrderByExternalFulfillmentId, getOrderVersion, transitionPersistedOrder } from "../persistence/order-pg.js";

export async function syncFulfillmentTracking(
  db:PostgresDatabase,
  provider:FulfillmentProvider,
  externalFulfillmentId:string
){
  const orderId=await findOrderByExternalFulfillmentId(db,externalFulfillmentId);
  if(!orderId)return{status:"ignored" as const,reason:"unknown-fulfillment"};

  const tracking=await provider.getTracking(externalFulfillmentId);
  const normalized=tracking.status.toLowerCase();

  if(["shipped","in_transit","in-transit","out_for_delivery"].includes(normalized)){
    const current=await getOrderVersion(db,orderId);
    if(current&&(current.status==="submitted"||current.status==="paid"))
      await transitionPersistedOrder(db,orderId,"shipped",current.version);
  }else if(["delivered","completed"].includes(normalized)){
    const current=await getOrderVersion(db,orderId);
    if(current&&["submitted","shipped"].includes(current.status))
      await transitionPersistedOrder(db,orderId,"delivered",current.version);
  }

  return{status:"synced" as const,orderId,providerStatus:tracking.status,trackingNumber:tracking.trackingNumber};
}
