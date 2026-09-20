export interface FxProvider{
  readonly id:string;
  convert(input:{amount:number;from:string;to:string;asOf?:Date}):Promise<{amount:number;rate:number;asOf:Date}>;
}
export interface TaxProvider{
  readonly id:string;
  quote(input:{amount:number;currency:string;country:string;postalCode?:string;category?:string}):Promise<{tax:number;total:number;rate:number;jurisdiction?:string}>;
}
export function assertCurrency(currency:string){if(!/^[A-Z]{3}$/.test(currency))throw new Error("Invalid ISO currency code");}
