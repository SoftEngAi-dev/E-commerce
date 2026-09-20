import test from"node:test";import assert from"node:assert/strict";import{exponentialBackoff}from"../src/application/job-queue.js";
test("worker backoff grows exponentially and is capped",()=>{assert.equal(exponentialBackoff(1),1000);assert.equal(exponentialBackoff(5),16000);assert.equal(exponentialBackoff(20),60000)});
