import type { PostgresDatabase } from "../persistence/postgres.js";
export async function releaseExpiredReservations(db:PostgresDatabase,limit=100){
  return db.transaction(async c=>{
    const reservations=await c.query<{order_id:string;product_id:string;quantity:number}>(
      "SELECT order_id,product_id,quantity FROM inventory_reservations WHERE status='reserved' AND expires_at<=now() ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT $1",[limit]
    );
    for(const row of reservations.rows){
      await c.query("UPDATE products SET reserved_stock=reserved_stock-$1,updated_at=now() WHERE id=$2 AND reserved_stock>=$1",[row.quantity,row.product_id]);
      await c.query("UPDATE inventory_reservations SET status='expired' WHERE order_id=$1 AND product_id=$2 AND status='reserved'",[row.order_id,row.product_id]);
      await c.query("UPDATE orders SET status='expired',version=version+1,updated_at=now() WHERE id=$1 AND status='pending_payment'",[row.order_id]);
      await c.query("INSERT INTO outbox_events(topic,aggregate_type,aggregate_id,payload) VALUES($1,$2,$3,$4)",["order.status.changed","order",row.order_id,JSON.stringify({orderId:row.order_id,status:"expired"})]);
    }
    return reservations.rowCount;
  });
}
