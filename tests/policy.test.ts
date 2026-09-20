import test from"node:test";import assert from"node:assert/strict";import{evaluatePolicy}from"../src/index.js";
test("policy engine defaults to deny without supplier authorization",()=>{const r=evaluatePolicy({market:"UY",channel:"store",supplierAuthorized:false,marketEnabled:true,channelEnabled:true});assert.equal(r.allowed,false)});
test("policy engine allows explicit compliant context",()=>{const r=evaluatePolicy({market:"UY",channel:"store",supplierAuthorized:true,marketEnabled:true,channelEnabled:true});assert.equal(r.allowed,true)});
