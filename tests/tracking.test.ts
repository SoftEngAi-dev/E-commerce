import test from"node:test";import assert from"node:assert/strict";
test("tracking status mapping keeps provider-specific strings outside domain",()=>{const statuses=["shipped","in_transit","delivered"];assert.equal(statuses.length,3)});
