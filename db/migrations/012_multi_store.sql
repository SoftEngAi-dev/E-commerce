CREATE TABLE IF NOT EXISTS stores(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  default_market CHAR(2) NOT NULL,
  default_currency CHAR(3) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_products(
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  custom_title TEXT,
  custom_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(store_id,product_id)
);

CREATE TABLE IF NOT EXISTS store_markets(
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  market CHAR(2) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  currency CHAR(3) NOT NULL,
  channel TEXT NOT NULL DEFAULT 'store',
  PRIMARY KEY(store_id,market,channel)
);

CREATE INDEX IF NOT EXISTS store_products_enabled_idx ON store_products(store_id,enabled,sort_order);
