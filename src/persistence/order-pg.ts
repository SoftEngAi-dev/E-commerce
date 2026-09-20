import type { PostgresDatabase } from "./postgres.js";
import type { OrderState } from "../domain/order.js";
import { canTransition } from "../domain/order.js";

export interface OrderLineInput { productId:string; externalId:string; title:string; quantity:number; unitPrice:number; unitCost:number; shippingCost:number }
export interface CreateOrderInput { id:string; storeId?:string; currency:string; subtotal:number; shipping:number; total:number; idempotencyKey:string; requestHash:string; customerId:string; shippingAddress:Record<string,unknown>; lines:OrderLineInput[] }

export interface PublicOrderRow {
  id:string;
  status:OrderState;
  currency:string;
  subtotal:number;
  shipping:number;
  total:number;
  version:number;
  externalPaymentId?:string;
  storeId?:string;
  customerId?:string;
  shippingAddress:Record<string,unknown>;
  createdAt:Date;
  updatedAt:Date;
}

export async function upsertCustomer(db:PostgresDatabase,email:string,country:string){
  const r=await db.query<{id:string}>(
    "INSERT INTO customers(email,country) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET country=EXCLUDED.country RETURNING id",
    [email,country.toUpperCase()]
  );
  return r.rows[0]?.id;
}

export async function createOrder(db:PostgresDatabase,input:CreateOrderInput){
  return db.transaction(async c=>{
    const existing=await c.query<{id:string;status:OrderState;total:number;request_hash:string|null}>(
      "SELECT id,status,total,request_hash FROM orders WHERE idempotency_key=$1",
      [input.idempotencyKey]
    );
    if(existing.rows[0]){
      if(existing.rows[0].request_hash!==input.requestHash)throw new Error("Idempotency key reused with a different request");
      return existing.rows[0];
    }

    for(const line of input.lines){
      const stock=await c.query<{available:number}>(
        "SELECT stock-reserved_stock AS available FROM products WHERE id=$1 AND status='published' FOR UPDATE",
        [line.productId]
      );
      const item=stock.rows[0];
      if(!item||item.available<line.quantity)throw new Error("Product unavailable: "+line.productId);
    }

    await c.query(
      "INSERT INTO orders(id,status,store_id,currency,subtotal,shipping,total,idempotency_key,request_hash,customer_id,shipping_address) VALUES($1,'pending_payment',$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [input.id,input.storeId??null,input.currency,input.subtotal,input.shipping,input.total,input.idempotencyKey,input.requestHash,input.customerId,input.shippingAddress]
    );

    for(const line of input.lines){
      await c.query("UPDATE products SET reserved_stock=reserved_stock+$1,updated_at=now() WHERE id=$2",[line.quantity,line.productId]);
      await c.query(
        "INSERT INTO inventory_reservations(order_id,product_id,quantity,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes')",
        [input.id,line.productId,line.quantity]
      );
      await c.query(
        "INSERT INTO order_items(order_id,product_id,external_id,title_snapshot,quantity,unit_price,unit_cost,shipping_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [input.id,line.productId,line.externalId,line.title,line.quantity,line.unitPrice,line.unitCost,line.shippingCost]
      );
    }

    return {id:input.id,status:"pending_payment" as const,total:input.total};
  });
}

export async function getOrderVersion(db:PostgresDatabase,id:string){
  const r=await db.query<{status:OrderState;version:number}>(
    "SELECT status,version FROM orders WHERE id=$1",
    [id]
  );
  return r.rows[0];
}

export async function transitionPersistedOrder(db:PostgresDatabase,id:string,to:OrderState,expectedVersion:number,externalPaymentId?:string,externalFulfillmentId?:string){
  return db.transaction(async c=>{
    const r=await c.query<{status:OrderState;version:number}>(
      "SELECT status,version FROM orders WHERE id=$1 FOR UPDATE",
      [id]
    );
    const current=r.rows[0];
    if(!current)throw new Error("Order not found");
    if(current.version!==expectedVersion)throw new Error("Order version conflict");
    if(!canTransition(current.status,to))throw new Error("Invalid order transition: "+current.status+" -> "+to);

    if((to==="cancelled"||to==="expired"||to==="refunded")&&(current.status==="pending_payment"||current.status==="paid")){
      const reservations=await c.query<{product_id:string;quantity:number}>(
        "SELECT product_id,quantity FROM inventory_reservations WHERE order_id=$1 AND status='reserved' FOR UPDATE",
        [id]
      );
      for(const item of reservations.rows){
        await c.query(
          "UPDATE products SET reserved_stock=reserved_stock-$1,updated_at=now() WHERE id=$2 AND reserved_stock>=$1",
          [item.quantity,item.product_id]
        );
        await c.query(
          "UPDATE inventory_reservations SET status='released' WHERE order_id=$1 AND product_id=$2 AND status='reserved'",
          [id,item.product_id]
        );
      }
    }

    if(to==="submitted"&&current.status==="paid"){
      const reservations=await c.query<{product_id:string;quantity:number}>(
        "SELECT product_id,quantity FROM inventory_reservations WHERE order_id=$1 AND status='reserved' FOR UPDATE",
        [id]
      );
      for(const item of reservations.rows){
        const updated=await c.query(
          "UPDATE products SET stock=stock-$1,reserved_stock=reserved_stock-$1,updated_at=now() WHERE id=$2 AND stock>=$1 AND reserved_stock>=$1 RETURNING id",
          [item.quantity,item.product_id]
        );
        if(updated.rowCount!==1)throw new Error("Insufficient stock at fulfillment commit");
        await c.query(
          "UPDATE inventory_reservations SET status='committed' WHERE order_id=$1 AND product_id=$2 AND status='reserved'",
          [id,item.product_id]
        );
      }
    }

    await c.query(
      "UPDATE orders SET status=$1,version=version+1,external_payment_id=COALESCE($3,external_payment_id),external_fulfillment_id=COALESCE($4,external_fulfillment_id),updated_at=now() WHERE id=$2",
      [to,id,externalPaymentId??null,externalFulfillmentId??null]
    );
    await c.query(
      "INSERT INTO outbox_events(topic,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)",
      ["order.status.changed","order",id,JSON.stringify({orderId:id,status:to,version:current.version+1})]
    );
    return {id,status:to,version:current.version+1};
  });
}

export async function getOrder(db:PostgresDatabase,id:string){
  const order=await db.query<PublicOrderRow>(
    'SELECT id,status,store_id AS "storeId",currency,subtotal,shipping,total,version,external_payment_id AS "externalPaymentId",customer_id AS "customerId",shipping_address AS "shippingAddress",created_at AS "createdAt",updated_at AS "updatedAt" FROM orders WHERE id=$1',
    [id]
  );
  const row=order.rows[0];
  if(!row)return;
  const items=await db.query<Record<string,unknown>>(
    'SELECT product_id AS "productId",external_id AS "externalId",title_snapshot AS "title",quantity,unit_price AS "unitPrice" FROM order_items WHERE order_id=$1 ORDER BY id',
    [id]
  );
  return {...row,items:items.rows};
}


export async function findOrderByExternalFulfillmentId(db:PostgresDatabase,externalFulfillmentId:string){
  const r=await db.query<{id:string}>("SELECT id FROM orders WHERE external_fulfillment_id=$1",[externalFulfillmentId]);
  return r.rows[0]?.id;
}
