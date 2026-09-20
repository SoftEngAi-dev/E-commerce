import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL is required");

const client=new Client({connectionString:databaseUrl});
await client.connect();

try{
  const files=(await readdir("db/migrations")).filter(x=>x.endsWith(".sql")).sort();
  for(const file of files)await client.query(await readFile(path.join("db/migrations",file),"utf8"));

  const product=await client.query<{id:string}>(
    "INSERT INTO products(external_id,source,title,currency,cost,stock,status,image_urls,category) VALUES($1,$2,$3,$4,$5,$6,'published',$7,$8) RETURNING id",
    ["smoke-1","ci","Smoke Product","UYU",10,5,[], "general"]
  );

  await client.query(
    "INSERT INTO stores(slug,name,default_market,default_currency) VALUES($1,$2,$3,$4)",
    ["smoke-store","Smoke Store","UY","UYU"]
  );

  const store=await client.query<{id:string}>("SELECT id FROM stores WHERE slug='smoke-store'");
  await client.query("INSERT INTO store_products(store_id,product_id) VALUES($1,$2)",[store.rows[0].id,product.rows[0].id]);
  await client.query("INSERT INTO store_markets(store_id,market,currency,enabled,channel) VALUES($1,'UY','UYU',true,'store')",[store.rows[0].id]);

  const verification=await client.query<{count:string}>(
    "SELECT COUNT(*)::text AS count FROM store_products WHERE product_id=$1",[product.rows[0].id]
  );
  if(verification.rows[0].count!=="1")throw new Error("PostgreSQL smoke test failed");
  console.log("PostgreSQL smoke test passed",files.length,"migrations");
}finally{
  await client.end();
}
