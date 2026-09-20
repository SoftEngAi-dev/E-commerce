import type { PostgresDatabase } from "./postgres.js";
import type { OrderState } from "../domain/order.js";
import { canTransition } from "../domain/order.js";

export interface OrderLineInput { productId:string; externalId:string; title:string; quantity:number; unitPrice:number; unitCost:number; shippingCost:number }
export interface CreateOrderInput { id:string; currency:string; subtotal:number; shipping:number; total:number; idempotencyKey:string; customerId:string; shippingAddress:Record<string,unknown>; lines:OrderLineInput[] }

export async function createOrder(db:PostgresDatabase,input:CreateOrderInput){
  return db.transaction(async c=>{
    const existing=await c.query<{id:string;status:OrderState;total:number}>('SELECT id,status,total FROM orders WHERE idempotency_key=$1',[input.idempotencyKey]);
    if(existing.rows[0])return existing.rows[0];
    await c.query('INSERT INTO orders(id,status,currency,subtotal,shipping,total,idempotency_key,customer_id,shipping_address) VALUES($1,\'pending_payment\',$2,$3,$4,$5,$6,$7,$8)',[input.id,input.currency,input.subtotal,input.shipping,input.total,input.idempotencyKey,input.customerId,input.shippingAddress]);
    for(const line of input.lines){
      await c.query('INSERT INTO order_items(order_id,product_id,external_id,title_snapshot,quantity,unit_price,unit_cost,shipping_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[input.id,line.productId,line.externalId,line.title,line.quantity,line.unitPrice,line.unitCost,line.shippingCost]);
    }
    return {id:input.id,status:'pending_payment' as const,total:input.total};
  });
}

export async function transitionPersistedOrder(db:PostgresDatabase,id:string,to:OrderState,expectedVersion:number,externalPaymentId?:string){
  return db.transaction(async c=>{
    const r=await c.query<{status:OrderState;version:number}>('SELECT status,version FROM orders WHERE id=$1 FOR UPDATE',[id]);
    const current=r.rows[0];if(!current)throw new Error('Order not found');
    if(current.version!==expectedVersion)throw new Error('Order version conflict');
    if(!canTransition(current.status,to))throw new Error('Invalid order transition: '+current.status+' -> '+to);
    await c.query('UPDATE orders SET status=$1,version=version+1,external_payment_id=COALESCE($3,external_payment_id),updated_at=now() WHERE id=$2',[to,id,externalPaymentId??null]);
    await c.query('INSERT INTO outbox_events(topic,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)',['order.status.changed','order',id,JSON.stringify({orderId:id,status:to})]);
    return {id,status:to,version:current.version+1};
  });
}

export async function getOrder(db:PostgresDatabase,id:string){
  const order=await db.query('SELECT id,status,currency,subtotal,shipping,total,version,external_payment_id AS "externalPaymentId",customer_id AS "customerId",shipping_address AS "shippingAddress",created_at AS "createdAt",updated_at AS "updatedAt" FROM orders WHERE id=$1',[id]);
  const row=order.rows[0];if(!row)return;
  const items=await db.query('SELECT product_id AS "productId",external_id AS "externalId",title_snapshot AS "title",quantity,unit_price AS "unitPrice",unit_cost AS "unitCost",shipping_cost AS "shippingCost" FROM order_items WHERE order_id=$1 ORDER BY id',[id]);
  return {...row,items:items.rows};
}
