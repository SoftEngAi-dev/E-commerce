CREATE TABLE IF NOT EXISTS compliance_checks(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  market TEXT NOT NULL,
  channel TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  policy_snapshot JSONB NOT NULL DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id,market,channel)
);
CREATE INDEX IF NOT EXISTS compliance_checks_product_idx ON compliance_checks(product_id,market,channel,checked_at DESC);
