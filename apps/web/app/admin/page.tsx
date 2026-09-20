async function getAdminData(){
  const base=process.env.COMMERCE_API_URL??"http://localhost:3000";
  const key=process.env.INTERNAL_SERVICE_KEY;
  const headers=key?{ "x-internal-service-key":key }:undefined;
  try{
    const [summary,pending]=await Promise.all([
      fetch(base+"/internal/analytics/summary",{headers,cache:"no-store"}),
      fetch(base+"/internal/ai/pending",{headers,cache:"no-store"})
    ]);
    const s=summary.ok?(await summary.json() as {summary?:{orders:number;publishedProducts:number;grossRevenue:number;jobs:{queued:number;running:number;dead:number}}}):undefined;
    const p=pending.ok?(await pending.json() as {items?:Array<{id:string;agent:string;task_type:string;risk:string;created_at:string}>}):undefined;
    return {summary:s?.summary,pending:p?.items??[]};
  }catch{return {summary:undefined,pending:[]}}
}

export default async function Admin(){
  const {summary,pending}=await getAdminData();
  return <main><header><div className="brand">OPERATIONS</div><nav><a href="/">Storefront</a><a href="/admin">Dashboard</a></nav></header>
    <section className="hero compact"><span className="eyebrow">CONTROL CENTER</span><h1>Commerce operations</h1><p>Live view of catalog, orders, jobs and AI decisions. Financial or irreversible actions remain policy-gated.</p></section>
    <section className="dashboard">
      <div className="metric-grid">
        <div className="metric"><span>ORDERS</span><strong>{summary?.orders??"—"}</strong><small>Persisted orders</small></div>
        <div className="metric"><span>PUBLISHED</span><strong>{summary?.publishedProducts??"—"}</strong><small>Live catalog</small></div>
        <div className="metric"><span>REVENUE</span><strong>{summary?summary.grossRevenue.toFixed(2):"—"}</strong><small>Paid/submitted/shipped/delivered</small></div>
        <div className="metric"><span>DEAD JOBS</span><strong>{summary?.jobs.dead??"—"}</strong><small>Requires attention</small></div>
      </div>
      <div className="panel"><div><span className="eyebrow">AI APPROVAL QUEUE</span><h2>{pending.length} pending</h2></div>
        {pending.length?<div className="queue">{pending.map(run=><div key={run.id}><span>{run.task_type} · {run.agent}</span><b>{run.risk}</b></div>)}</div>
        :<p className="muted">No AI actions currently waiting for approval.</p>}
      </div>
    </section>
  </main>
}
