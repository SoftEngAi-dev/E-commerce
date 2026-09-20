export interface NormalizedProduct{externalId:string;title:string;currency:string;cost:number;stock:number;imageUrls:string[];source:string;description?:string;category?:string}
export interface ProductSource{readonly id:string;listProducts(cursor?:string):Promise<{items:NormalizedProduct[];nextCursor?:string}>}

export interface PaymentItem{title:string;quantity:number;unitPrice:number}
export interface PaymentProvider{
  readonly id:string;
  createPayment(input:{orderId:string;amount:number;currency:string;idempotencyKey:string;customerEmail?:string;items?:PaymentItem[];successUrl?:string;failureUrl?:string;pendingUrl?:string}):Promise<{externalId:string;checkoutUrl?:string}>;
  refund(input:{externalPaymentId:string;amount?:number;idempotencyKey:string}):Promise<void>
}

export interface FulfillmentProvider{
  readonly id:string;
  submit(input:{orderId:string;items:Array<{sku:string;quantity:number}>;address:string;idempotencyKey:string}):Promise<{externalId:string}>;
  getTracking(id:string):Promise<{status:string;trackingNumber?:string}>
}
