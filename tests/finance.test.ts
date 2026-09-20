import test from"node:test";import assert from"node:assert/strict";import{assertCurrency}from"../src/index.js";
test("finance contracts validate ISO currency shape",()=>{assert.doesNotThrow(()=>assertCurrency("USD"));assert.throws(()=>assertCurrency("US"))});
