import type { TaxProvider } from "../domain/finance.js";
import type { PostgresDatabase } from "../persistence/postgres.js";
import { quotePrice } from "../domain/pricing.js";
import { getProduct, type ProductRecord } from "../persistence/product-pg.js";

export interface CartLineInput{productId:string;quantity:number}
export interface PriceCartOptions{storeSlug?:string;country?:string;postalCode?:string;taxProvider?:TaxProvider}
export interface PricedCartLine{productId:string;title:string;quantity:number;unitPrice:number;subtotal:number;currency:string;cost:number;shippingCost:number}
export interface PricedCart{
  currency:string;
  subtotal:number;
  tax:number;
  total:number;
  grossMargin:number;
  grossMarginRate:number;
  taxRate:number;
  taxJurisdiction?:string;
  lines:PricedCartLine[];
  products:ProductRecord[];
}

export async function priceCart(db:PostgresDatabase,lines:CartLineInput[],options:PriceCartOptions={}):Promise<PricedCart>{
  if(!lines.length)throw new Error("Cart is empty");
  const result:PricedCart={currency:"",subtotal:0,tax:0,total:0,grossMargin:0,grossMarginRate:0,taxRate:0,lines:[],products:[]};
  for(const line of lines){
    if(!Number.isInteger(line.quantity)||line.quantity<=0)throw new Error("Invalid quantity");
    const product=await getProduct(db,line.productId,options.storeSlug);
    if(!product||product.status!=="published"||(product.stock-product.reservedStock)<line.quantity)throw new Error("Product unavailable: "+line.productId);
    if(result.currency&&result.currency!==product.currency)throw new Error("Mixed currencies are not supported in one cart");
    result.currency=product.currency;
    const pricing=quotePrice({supplierCost:product.cost,shippingCost:product.shippingCost,feeRate:product.feeRate,targetMarginRate:product.targetMarginRate});
    result.subtotal+=pricing.price*line.quantity;
    result.grossMargin+=pricing.grossMargin*line.quantity;
    result.lines.push({productId:product.id,title:product.title,quantity:line.quantity,unitPrice:pricing.price,subtotal:pricing.price*line.quantity,currency:product.currency,cost:product.cost,shippingCost:product.shippingCost});
    result.products.push(product);
  }

  if(options.taxProvider&&options.country){
    const tax=await options.taxProvider.quote({amount:result.subtotal,currency:result.currency,country:options.country,postalCode:options.postalCode});
    result.tax=tax.tax;result.taxRate=tax.rate;result.taxJurisdiction=tax.jurisdiction;
  }

  result.total=result.subtotal+result.tax;
  result.grossMarginRate=result.total>0?result.grossMargin/result.total:0;
  return result;
}
