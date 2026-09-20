import type { PostgresDatabase } from "../persistence/postgres.js";

export async function getOperationalSummary(db:PostgresDatabase){
  const [orders,products,revenue,jobs]=await Promise.all([
    db.query<{count:string}>("SELECT COUNT(*)::text AS count FROM orders"),
    db.query<{count:string}>("SELECT COUNT(*)::text AS count FROM products WHERE status='published'"),
    db.query<{value:string|null}>("SELECT COALESCE(SUM(total),0)::text AS value FROM orders WHERE status IN ('paid','submitted','shipped','delivered')"),
    db.query<{queued:string;running:string;dead:string}>("SELECT COUNT(*) FILTER(WHERE status='queued')::text AS queued,COUNT(*) FILTER(WHERE status='running')::text AS running,COUNT(*) FILTER(WHERE status='dead')::text AS dead FROM jobs")
  ]);
  return {
    orders:Number(orders.rows[0]?.count??0),
    publishedProducts:Number(products.rows[0]?.count??0),
    grossRevenue:Number(revenue.rows[0]?.value??0),
    jobs:{queued:Number(jobs.rows[0]?.queued??0),running:Number(jobs.rows[0]?.running??0),dead:Number(jobs.rows[0]?.dead??0)}
  };
}

export async function getProductPerformance(db:PostgresDatabase,limit=50){
  const r=await db.query<{
    productId:string;title:string;orders:number;units:number;revenue:number
  }>(
    `SELECT oi.product_id AS "productId",MAX(oi.title_snapshot) AS title,
       COUNT(DISTINCT oi.order_id)::int AS orders,
       SUM(oi.quantity)::int AS units,
       SUM(oi.unit_price*oi.quantity)::numeric AS revenue
     FROM order_items oi JOIN orders o ON o.id=oi.order_id
     WHERE o.status IN ('paid','submitted','shipped','delivered')
     GROUP BY oi.product_id
     ORDER BY revenue DESC LIMIT $1`,[Math.min(Math.max(1,limit),100)]
  );
  return r.rows.map(row=>({...row,revenue:Number(row.revenue)}));
}
