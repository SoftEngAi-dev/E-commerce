import type { FxProvider } from "../domain/finance.js";

export class HttpFxProvider implements FxProvider{
  readonly id="http-fx";
  constructor(private readonly baseUrl:string,private readonly token?:string){}
  async convert(input:{amount:number;from:string;to:string;asOf?:Date}){
    const u=new URL(this.baseUrl.replace(/\/$/,"")+"/fx/convert");
    u.searchParams.set("amount",String(input.amount));u.searchParams.set("from",input.from);u.searchParams.set("to",input.to);
    const response=await fetch(u,{headers:this.token?{authorization:"Bearer "+this.token}:{}});if(!response.ok)throw new Error("FX provider failed: "+response.status);
    const data=await response.json() as {amount?:number;rate?:number;asOf?:string};
    if(typeof data.amount!=="number"||typeof data.rate!=="number")throw new Error("Invalid FX response");
    return{amount:data.amount,rate:data.rate,asOf:data.asOf?new Date(data.asOf):new Date()};
  }
}
