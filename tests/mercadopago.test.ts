import test from "node:test";import assert from "node:assert/strict";import{createHmac}from"node:crypto";import{verifyMercadoPagoSignature}from"../src/adapters/mercado-pago-webhook.js";import{MercadoPagoCheckoutProProvider}from"../src/adapters/mercado-pago.js";

test("Mercado Pago webhook signature validates the documented manifest",()=>{
  const secret="test-secret";
  const requestId="req-123";
  const dataId="order-456";
  const ts="1704908010";
  const manifest="id:"+dataId+";request-id:"+requestId+";ts:"+ts+";";
  const v1=createHmac("sha256",secret).update(manifest).digest("hex");
  assert.equal(verifyMercadoPagoSignature({signature:"ts="+ts+",v1="+v1,requestId,dataId,secret}),true);
  assert.equal(verifyMercadoPagoSignature({signature:"ts="+ts+",v1=bad",requestId,dataId,secret}),false);
});

test("Mercado Pago adapter uses Orders API idempotency header",async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=(async(input,init)=>{
    assert.equal(String(input),"https://api.mercadopago.com/v1/orders");
    const headers=new Headers(init?.headers);
    assert.equal(headers.get("x-idempotency-key"),"idem-123");
    assert.equal(headers.get("authorization"),"Bearer token");
    return new Response(JSON.stringify({id:"MP-1",checkout_url:"https://mp.test/checkout"}),{status:201,headers:{"content-type":"application/json"}});
  }) as typeof fetch;
  try{
    const p=new MercadoPagoCheckoutProProvider({accessToken:"token",successUrl:"https://example.test/s",failureUrl:"https://example.test/f",pendingUrl:"https://example.test/p"});
    const r=await p.createPayment({orderId:"order-1",amount:100,currency:"UYU",idempotencyKey:"idem-123",customerEmail:"a@example.com",items:[{title:"Item",quantity:1,unitPrice:100}]});
    assert.equal(r.externalId,"MP-1");
    assert.equal(r.checkoutUrl,"https://mp.test/checkout");
  }finally{globalThis.fetch=original}
});
