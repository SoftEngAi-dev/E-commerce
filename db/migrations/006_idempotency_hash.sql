ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_hash TEXT;
CREATE INDEX IF NOT EXISTS orders_request_hash_idx ON orders(idempotency_key,request_hash);
