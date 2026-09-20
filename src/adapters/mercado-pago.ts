import type { PaymentItem, PaymentProvider } from "../domain/providers.js";

export interface MercadoPagoConfig {
  accessToken:string;
  apiBaseUrl?:string;
  successUrl:string;
  failureUrl:string;
  pendingUrl:string;
}

interface MercadoPagoOrderResponse { id?:string; checkout_url?:string; status?:string; currency?:string; total_amount?:string; total_paid_amount?:string }

export class MercadoPagoCheckoutProProvider implements PaymentProvider {
  readonly id="mercado-pago-orders";
  private readonly base:string;

  constructor(private readonly config:MercadoPagoConfig){
    this.base=(config.apiBaseUrl??"https://api.mercadopago.com").replace(/\/$/,"");
  }

  async createPayment(input:{
    orderId:string;amount:number;currency:string;idempotencyKey:string;
    customerEmail?:string;items?:PaymentItem[];successUrl?:string;failureUrl?:string;pendingUrl?:string
  }){
    if(input.currency!=="UYU")throw new Error("Mercado Pago Uruguay adapter currently expects UYU");
    const items=(input.items??[]).map(item=>({
      title:item.title,
      quantity:item.quantity,
      unit_price:item.unitPrice.toFixed(2),
      unit_measure:"unit",
      total_amount:(item.unitPrice*item.quantity).toFixed(2)
    }));
    const payload:{
      type:"online";processing_mode:"manual";total_amount:string;external_reference:string;
      payer?:{email:string};items?:typeof items;
      config:{online:{success_url:string;failure_url:string;pending_url:string}}
    }={
      type:"online",
      processing_mode:"manual",
      total_amount:input.amount.toFixed(2),
      external_reference:input.orderId,
      config:{online:{
        success_url:input.successUrl??this.config.successUrl,
        failure_url:input.failureUrl??this.config.failureUrl,
        pending_url:input.pendingUrl??this.config.pendingUrl
      }}
    };
    if(input.customerEmail)payload.payer={email:input.customerEmail};
    if(items.length)payload.items=items;

    const response=await fetch(this.base+"/v1/orders",{
      method:"POST",
      headers:{
        accept:"application/json",
        "content-type":"application/json",
        authorization:"Bearer "+this.config.accessToken,
        "x-idempotency-key":input.idempotencyKey
      },
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error("Mercado Pago create order failed: "+response.status);
    const data=(await response.json()) as MercadoPagoOrderResponse;
    if(!data.id)throw new Error("Mercado Pago did not return an order id");
    return {externalId:data.id,checkoutUrl:data.checkout_url};
  }

  async refund(input:{externalPaymentId:string;amount?:number;transactionId?:string;idempotencyKey:string}){
    if(input.amount!==undefined&&!input.transactionId)throw new Error("Partial Mercado Pago refunds require transactionId");
    const body=input.amount===undefined?undefined:JSON.stringify({
      transactions:[{id:input.transactionId,amount:input.amount.toFixed(2)}]
    });
    const response=await fetch(this.base+"/v1/orders/"+encodeURIComponent(input.externalPaymentId)+"/refund",{
      method:"POST",
      headers:{
        accept:"application/json",
        "content-type":"application/json",
        authorization:"Bearer "+this.config.accessToken,
        "x-idempotency-key":input.idempotencyKey
      },
      ...(body?{body}:{})
    });
    if(!response.ok)throw new Error("Mercado Pago refund failed: "+response.status);
  }

  async getStatus(externalPaymentId:string){
    const response=await fetch(this.base+"/v1/orders/"+encodeURIComponent(externalPaymentId),{
      headers:{accept:"application/json",authorization:"Bearer "+this.config.accessToken}
    });
    if(!response.ok)throw new Error("Mercado Pago order lookup failed: "+response.status);
    const data=(await response.json()) as MercadoPagoOrderResponse;
    if(!data.status)throw new Error("Mercado Pago response has no status");
    return {
      status:data.status,
      currency:data.currency,
      amount:data.total_paid_amount?Number(data.total_paid_amount):data.total_amount?Number(data.total_amount):undefined
    };
  }
}
