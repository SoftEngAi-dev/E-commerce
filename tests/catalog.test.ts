import test from"node:test";import assert from"node:assert/strict";import{InMemoryCatalog}from"../src/application/catalog.js";
test("catalog upserts and reads normalized products",async()=>{const c=new InMemoryCatalog();await c.upsert({source:"demo",externalId:"1",title:"Product",currency:"USD",cost:10,stock:4,imageUrls:[]});const p=await c.get("demo","1");assert.equal(p?.title,"Product")});
