import test from "node:test";import assert from "node:assert/strict";import{signHmac,verifyHmac,ReplayGuard}from"../src/security/hmac.js";import{authenticateApiKey}from"../src/security/admin-auth.js";
test("HMAC verifies and rejects tampering",()=>{const s=signHmac("payload","secret");assert.equal(verifyHmac("payload",s,"secret"),true);assert.equal(verifyHmac("tampered",s,"secret"),false)});
test("replay guard accepts an event once",()=>{const g=new ReplayGuard(60000);assert.equal(g.accept("evt-1",1000),true);assert.equal(g.accept("evt-1",1001),false)});
test("wrong admin key is rejected",()=>{assert.equal(authenticateApiKey("bad-key","very-long-secret-key"),null)});
