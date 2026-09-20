import type { PaymentProvider } from "../domain/providers.js";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { findOrderByExternalPaymentId } from "../persistence/payment-pg.js";
import { getOrderVersion, transitionPersistedOrder } from "../persistence/order-pg.js";

export async function syncExternalPayment(db:PostgresDatabase,provider:PaymentProvider,externalPaymentId:string){
  if(!provider.getStatus)throw new Error("Provider does not support payment status lookup");
  const orderId=await findOrderByExternalPaymentId(db,externalPaymentId);
  if(!orderId)return {status:"ignored" as const,reason:"unknown-payment"};
  const remote=await provider.getStatus(externalPaymentId);
  if(remote.status==="processed"||remote.status==="approved"){
    const current=await getOrderVersion(db,orderId);
    if(current&&current.status==="pending_payment")await transitionPersistedOrder(db,orderId,"paid",current.version,externalPaymentId);
    return {status:"paid" as const,orderId};
  }
  if(remote.status==="canceled"||remote.status==="cancelled"){
    const current=await getOrderVersion(db,orderId);
    if(current&&current.status==="pending_payment")await transitionPersistedOrder(db,orderId,"cancelled",current.version,externalPaymentId);
    return {status:"cancelled" as const,orderId};
  }
  if(remote.status==="refunded"){
    const current=await getOrderVersion(db,orderId);
    if(current&&(current.status==="paid"||current.status==="submitted"||current.status==="shipped"||current.status==="delivered"))await transitionPersistedOrder(db,orderId,"refunded",current.version,externalPaymentId);
    return {status:"refunded" as const,orderId};
  }
  return {status:"unchanged" as const,orderId,remoteStatus:remote.status};
}
