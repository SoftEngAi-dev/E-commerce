CREATE TABLE IF NOT EXISTS payment_attempts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  checkout_url TEXT,
  idempotency_key TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK(amount>=0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider,idempotency_key),
  UNIQUE(provider,external_id)
);
CREATE INDEX IF NOT EXISTS payment_attempts_order_idx ON payment_attempts(order_id,created_at DESC);
