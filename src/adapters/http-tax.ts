import type { TaxProvider } from "../domain/finance.js";

export class HttpTaxProvider implements TaxProvider{
  readonly id="http-tax";
  private readonly baseUrl:string;
  constructor(baseUrl:string,private readonly token:string){
    this.baseUrl=baseUrl.endsWith("/")?baseUrl.slice(0,-1):baseUrl;
  }

  async quote(input:{amount:number;currency:string;country:string;postalCode?:string;category?:string}){
    const response=await fetch(this.baseUrl+"/tax/quote",{
      method:"POST",
      headers:{accept:"application/json","content-type":"application/json",authorization:"Bearer "+this.token},
      body:JSON.stringify(input)
    });
    if(!response.ok)throw new Error("Tax provider failed: "+response.status);
    const data=await response.json() as {tax?:number;total?:number;rate?:number;jurisdiction?:string};
    if(typeof data.tax!=="number"||typeof data.total!=="number"||typeof data.rate!=="number")
      throw new Error("Invalid tax provider response");
    return {
      tax:data.tax,
      total:data.total,
      rate:data.rate,
      ...(data.jurisdiction?{jurisdiction:data.jurisdiction}:{})
    };
  }
}
