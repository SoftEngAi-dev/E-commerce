import type { ProductSource, PaymentProvider, FulfillmentProvider } from "../domain/providers.js";

export class ProviderRegistry {
  private productSources=new Map<string,ProductSource>();
  private payments=new Map<string,PaymentProvider>();
  private fulfillmentProviders=new Map<string,FulfillmentProvider>();

  addProductSource(p:ProductSource){this.productSources.set(p.id,p);return this}
  addPayment(p:PaymentProvider){this.payments.set(p.id,p);return this}
  addFulfillment(p:FulfillmentProvider){this.fulfillmentProviders.set(p.id,p);return this}

  productSource(id:string){const p=this.productSources.get(id);if(!p)throw new Error("Unknown product source: "+id);return p}
  payment(id:string){const p=this.payments.get(id);if(!p)throw new Error("Unknown payment provider: "+id);return p}
  fulfillment(id:string){const p=this.fulfillmentProviders.get(id);if(!p)throw new Error("Unknown fulfillment provider: "+id);return p}
}
