ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
CREATE INDEX IF NOT EXISTS orders_store_idx ON orders(store_id,created_at DESC);
