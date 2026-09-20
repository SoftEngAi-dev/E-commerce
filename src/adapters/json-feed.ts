import { z } from "zod";
import type { ProductSource, NormalizedProduct } from "../domain/providers.js";

const itemSchema=z.object({
  id:z.string(),
  title:z.string().min(1),
  description:z.string().optional(),
  currency:z.string().length(3),
  cost:z.number().nonnegative(),
  stock:z.number().int().nonnegative(),
  imageUrls:z.array(z.string().url()).default([]),
  category:z.string().optional()
});

export class JsonFeedProductSource implements ProductSource{
  readonly id:string;
  constructor(id:string,private readonly url:string,private readonly headers:Record<string,string>={}){this.id=id}
  async listProducts(cursor?:string){
    const next=cursor?this.url+(this.url.includes("?")?"&":"?")+"cursor="+encodeURIComponent(cursor):this.url;
    const r=await fetch(next,{headers:this.headers});
    if(!r.ok)throw new Error("Supplier feed failed: "+r.status);
    const raw=await r.json() as unknown;
    const rows=z.array(itemSchema).parse(raw);
    const items:NormalizedProduct[]=rows.map(x=>({externalId:x.id,title:x.title,description:x.description,currency:x.currency,cost:x.cost,stock:x.stock,imageUrls:x.imageUrls,category:x.category,source:this.id}));
    return{items};
  }
}
