import type { PaymentProvider } from "../domain/providers.js";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { getPaymentContext, savePaymentAttempt } from "../persistence/payment-pg.js";

export async function createPaymentForOrder(db:PostgresDatabase,provider:PaymentProvider,orderId:string,idempotencyKey:string){
  const context=await getPaymentContext(db,orderId);if(!context)throw new Error("Order not found");
  const payment=await provider.createPayment({
    orderId:context.orderId,amount:context.amount,currency:context.currency,idempotencyKey,
    customerEmail:context.customerEmail,items:context.items
  });
  await savePaymentAttempt(db,{orderId,provider:provider.id,externalId:payment.externalId,status:"created",checkoutUrl:payment.checkoutUrl,idempotencyKey,amount:context.amount,currency:context.currency});
  return payment;
}
