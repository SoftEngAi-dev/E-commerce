import type { FulfillmentProvider } from "../domain/providers.js";

export interface HttpFulfillmentConfig{
  baseUrl:string;
  token:string;
  submitPath?:string;
  trackingPath?:string;
}

export class HttpFulfillmentProvider implements FulfillmentProvider{
  readonly id="http-fulfillment";
  private readonly baseUrl:string;
  constructor(private readonly config:HttpFulfillmentConfig){
    this.baseUrl=config.baseUrl.replace(/\/$/,"");
  }

  async submit(input:{orderId:string;items:Array<{sku:string;quantity:number}>;address:string;idempotencyKey:string}){
    const response=await fetch(this.baseUrl+(this.config.submitPath??"/fulfillments"),{
      method:"POST",
      headers:{
        accept:"application/json",
        "content-type":"application/json",
        authorization:"Bearer "+this.config.token,
        "x-idempotency-key":input.idempotencyKey
      },
      body:JSON.stringify(input)
    });
    if(!response.ok)throw new Error("Fulfillment submit failed: "+response.status);
    const data=await response.json() as {id?:string};
    if(!data.id)throw new Error("Fulfillment provider did not return an id");
    return {externalId:data.id};
  }

  async getTracking(id:string){
    const path=(this.config.trackingPath??"/fulfillments/:id").replace(":id",encodeURIComponent(id));
    const response=await fetch(this.baseUrl+path,{
      headers:{accept:"application/json",authorization:"Bearer "+this.config.token}
    });
    if(!response.ok)throw new Error("Fulfillment tracking lookup failed: "+response.status);
    const data=await response.json() as {status?:string;trackingNumber?:string};
    if(!data.status)throw new Error("Fulfillment tracking response has no status");
    return {status:data.status,trackingNumber:data.trackingNumber};
  }
}
