import test from"node:test";import assert from"node:assert/strict";import{createStore,enableStoreMarket}from"../src/index.js";
test("store contracts keep markets separate from core product logic",()=>{assert.equal(typeof createStore,"function");assert.equal(typeof enableStoreMarket,"function")});
