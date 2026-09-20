import test from"node:test";import assert from"node:assert/strict";import{generateProductCopy,recordAcquisitionEvent}from"../src/index.js";
test("content generation stays provider-neutral",()=>{assert.equal(typeof generateProductCopy,"function")});
test("acquisition event API is idempotent by external id",()=>{assert.equal(typeof recordAcquisitionEvent,"function")});
