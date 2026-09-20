import type { PostgresDatabase } from "../persistence/postgres.js";
import type { SupplierProvider } from "../domain/suppliers.js";
import { ingestCatalogCandidate } from "./catalog-intelligence.js";

export interface SupplierImportOptions{
  market:string;
  channel:"store"|"marketplace"|"social";
  signalProvider:(product:{title:string;cost:number;stock:number})=>Promise<{demand:number;margin:number;competition:number;supplier:number;shipping:number;risk:number;trend:number}>;
  claimsProvider?:(product:{title:string})=>Promise<string[]>;
}

export async function importSupplierPage(db:PostgresDatabase,supplier:SupplierProvider,options:SupplierImportOptions,cursor?:string){
  if(!supplier.policy.dropshippingAllowed||!supplier.policy.internationalSalesAllowed)
    throw new Error("Supplier is not explicitly authorized for automated dropshipping/international sales");

  const page=await supplier.listProducts(cursor);
  let imported=0;const results=[];
  for(const product of page.items){
    const signals=await options.signalProvider({title:product.title,cost:product.cost,stock:product.stock});
    const claims=options.claimsProvider?await options.claimsProvider({title:product.title}):[];
    const result=await ingestCatalogCandidate(db,{product,market:options.market,channel:options.channel,claims,signals,supplierPolicy:supplier.policy});
    imported++;results.push(result);
  }
  return{imported,nextCursor:page.nextCursor,results};
}
