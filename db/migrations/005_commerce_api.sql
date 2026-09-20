ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(shipping_cost>=0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS fee_rate NUMERIC(8,6) NOT NULL DEFAULT 0 CHECK(fee_rate>=0 AND fee_rate<1);
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_margin_rate NUMERIC(8,6) NOT NULL DEFAULT 0.30 CHECK(target_margin_rate>=0 AND target_margin_rate<1);
ALTER TABLE products ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS customers(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT NOT NULL,country CHAR(2) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(email));
CREATE TABLE IF NOT EXISTS order_items(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,product_id UUID NOT NULL REFERENCES products(id),external_id TEXT NOT NULL,title_snapshot TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price>=0),unit_cost NUMERIC(14,2) NOT NULL CHECK(unit_cost>=0),shipping_cost NUMERIC(14,2) NOT NULL CHECK(shipping_cost>=0),UNIQUE(order_id,product_id));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS products_public_idx ON products(status,stock,published_at);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
