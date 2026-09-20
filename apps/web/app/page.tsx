type Product={id:string;title?:string;name?:string;price?:number;currency?:string;imageUrls?:string[];description?:string};

async function getProducts():Promise<Product[]>{
  const base=process.env.COMMERCE_API_URL??"http://localhost:3000";
  const store=process.env.COMMERCE_STORE_SLUG;
  const endpoint=store?base+"/api/products?store="+encodeURIComponent(store):base+"/api/products";
  try{
    const response=await fetch(endpoint,{cache:"no-store"});
    if(!response.ok)return[];
    const data=(await response.json()) as {items?:Product[]};
    return Array.isArray(data.items)?data.items:[];
  }catch{return[]}
}

export default async function Home(){
  const products=await getProducts();
  return <main>
    <header><div className="brand">AUTONOMOUS COMMERCE</div><nav><a href="#catalog">Catalog</a><a href="/admin">Operations</a></nav></header>
    <section className="hero">
      <span className="eyebrow">AI-ASSISTED GLOBAL COMMERCE</span>
      <h1>Discover products.<br/>Operate with evidence.</h1>
      <p>The platform evaluates products, protects margins, checks supplier constraints and coordinates fulfillment through provider-neutral services.</p>
      <div className="actions"><a className="button" href="#catalog">Explore catalog</a><a className="button ghost" href="/admin">Open operations</a></div>
    </section>
    <section id="catalog" className="catalog">
      <div className="section-head"><div><span className="eyebrow">CATALOG</span><h2>Published products</h2></div><span className="muted">{products.length?"Live API catalog":"Local/demo mode"}</span></div>
      {products.length?<div className="grid">{products.map(p=><article className="card" key={p.id}>
        <div className="score">PUBLISHED</div><h3>{p.title??p.name??"Product"}</h3>
        <p>{p.description??"Normalized supplier product with server-side pricing and policy checks."}</p>
        <div className="row"><strong>{p.currency??""} {typeof p.price==="number"?p.price.toFixed(2):"—"}</strong><span>View product →</span></div>
      </article>)}</div>
      :<div className="empty"><h3>No published products yet</h3><p>Connect a supplier source, pass compliance and product intelligence checks, then publish candidates here.</p></div>}
    </section>
  </main>
}
