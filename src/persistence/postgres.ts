import{Pool,PoolClient,QueryResultRow}from"pg";
import type{NormalizedProduct}from"../domain/providers.js";
export class PostgresDatabase{
  readonly pool:Pool;
  constructor(connectionString:string){this.pool=new Pool({connectionString,max:10,idleTimeoutMillis:30000})}
  async query<T extends QueryResultRow=QueryResultRow>(text:string,values:unknown[]=[]){return this.pool.query<T>(text,values)}
  async transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{const c=await this.pool.connect();try{await c.query("BEGIN");const out=await fn(c);await c.query("COMMIT");return out}catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}}
  async close(){await this.pool.end()}
}
export async function upsertProduct(db:PostgresDatabase,p:NormalizedProduct){await db.query(
  "INSERT INTO products(external_id,source,title,description,currency,cost,stock,status) VALUES($1,$2,$3,$4,$5,$6,$7,'draft') ON CONFLICT(source,external_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,currency=EXCLUDED.currency,cost=EXCLUDED.cost,stock=EXCLUDED.stock,updated_at=now()",
  [p.externalId,p.source,p.title,p.description??null,p.currency,p.cost,p.stock]
)}
export async function reserveInventory(db:PostgresDatabase,orderId:string,productId:string,quantity:number,expiresAt:Date){return db.transaction(async c=>{
  if(!Number.isInteger(quantity)||quantity<=0)throw new Error("Invalid quantity");
  const row=await c.query<{id:string;available:number;reserved_stock:number}>(
    "SELECT id,stock-reserved_stock AS available,reserved_stock FROM products WHERE id=$1 FOR UPDATE",[productId]);
  const item=row.rows[0];if(!item||item.available<quantity)throw new Error("Insufficient stock");
  await c.query("UPDATE products SET reserved_stock=reserved_stock+$1,updated_at=now() WHERE id=$2",[quantity,productId]);
  await c.query("INSERT INTO inventory_reservations(order_id,product_id,quantity,expires_at) VALUES($1,$2,$3,$4) ON CONFLICT(order_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,expires_at=EXCLUDED.expires_at,status='reserved'",[orderId,productId,quantity,expiresAt]);
  return{availableAfter:item.available-quantity,reservedAfter:item.reserved_stock+quantity};
})}
