import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { NormalizedProduct } from "../domain/providers.js";

export class PostgresDatabase{
  readonly pool:Pool;
  constructor(connectionString:string){this.pool=new Pool({connectionString,max:10,idleTimeoutMillis:30000})}
  async query<T extends QueryResultRow=QueryResultRow>(text:string,values:unknown[]=[]){return this.pool.query<T>(text,values)}
  async transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
    const client=await this.pool.connect();
    try{await client.query("BEGIN");const result=await fn(client);await client.query("COMMIT");return result}
    catch(error){await client.query("ROLLBACK");throw error}
    finally{client.release()}
  }
  async close(){await this.pool.end()}
}

export async function upsertProduct(db:PostgresDatabase,p:NormalizedProduct){
  if(p.stock<0||p.cost<0||!p.title.trim())throw new Error("Invalid normalized product");
  await db.query(
    "INSERT INTO products(external_id,source,title,description,currency,cost,stock,image_urls,category,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft') ON CONFLICT(source,external_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,currency=EXCLUDED.currency,cost=EXCLUDED.cost,stock=EXCLUDED.stock,image_urls=EXCLUDED.image_urls,category=EXCLUDED.category,updated_at=now()",
    [p.externalId,p.source,p.title,p.description??null,p.currency,p.cost,p.stock,p.imageUrls,p.category??null]
  )
}
