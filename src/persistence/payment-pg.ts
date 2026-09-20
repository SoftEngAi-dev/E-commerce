import type { PostgresDatabase } from "./postgres.js";

export interface PaymentContext {
  orderId:string;
  amount:number;
  currency:string;
  customerEmail?:string;
  items:Array<{title:string;quantity:number;unitPrice:number}>;
}

export async function getPaymentContext(db:PostgresDatabase,orderId:string):Promise<PaymentContext|undefined>{
  const order=await db.query<{orderId:string;amount:number;currency:string;email:string|undefined}>(
    'SELECT o.id AS "orderId",o.total AS amount,o.currency,c.email FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.id=$1',
    [orderId]
  );
  const row=order.rows[0];if(!row)return;
  const items=await db.query<{title:string;quantity:number;unitPrice:number}>(
    'SELECT title_snapshot AS "title",quantity,unit_price AS "unitPrice" FROM order_items WHERE order_id=$1 ORDER BY id',[orderId]
  );
  return {orderId:row.orderId,amount:Number(row.amount),currency:row.currency,customerEmail:row.email,items:items.rows.map(x=>({...x,unitPrice:Number(x.unitPrice)}))};
}

export async function savePaymentAttempt(db:PostgresDatabase,input:{orderId:string;provider:string;externalId:string;status:string;checkoutUrl?:string;idempotencyKey:string;amount:number;currency:string}){
  const r=await db.query<{id:string}>(
    'INSERT INTO payment_attempts(order_id,provider,external_id,status,checkout_url,idempotency_key,amount,currency) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(provider,idempotency_key) DO UPDATE SET external_id=EXCLUDED.external_id,status=EXCLUDED.status,checkout_url=EXCLUDED.checkout_url,updated_at=now() RETURNING id',
    [input.orderId,input.provider,input.externalId,input.status,input.checkoutUrl??null,input.idempotencyKey,input.amount,input.currency]
  );
  return r.rows[0]?.id;
}

export async function findOrderByExternalPaymentId(db:PostgresDatabase,externalId:string){
  const r=await db.query<{orderId:string}>('SELECT order_id AS "orderId" FROM payment_attempts WHERE external_id=$1',[externalId]);
  return r.rows[0]?.orderId;
}
