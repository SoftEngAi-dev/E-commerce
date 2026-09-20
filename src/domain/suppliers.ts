import type { NormalizedProduct } from "./providers.js";
import type { SupplierPolicy } from "../application/compliance.js";

export interface SupplierProvider{
  readonly id:string;
  readonly policy:SupplierPolicy;
  listProducts(cursor?:string):Promise<{items:NormalizedProduct[];nextCursor?:string}>;
}
export interface AcquisitionChannel{
  readonly id:string;
  publish(input:{productId:string;title:string;description:string;price:number;currency:string;metadata?:Record<string,unknown>}):Promise<{externalId:string;url?:string}>;
  pause(externalId:string):Promise<void>;
}
