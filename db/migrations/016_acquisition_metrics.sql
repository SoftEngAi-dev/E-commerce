CREATE TABLE IF NOT EXISTS acquisition_events(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  product_id UUID REFERENCES products(id),
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  session_id TEXT,
  external_event_id TEXT,
  value NUMERIC(14,4),
  currency CHAR(3),
  metadata JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel,external_event_id)
);
CREATE INDEX IF NOT EXISTS acquisition_events_channel_idx ON acquisition_events(channel,event_type,occurred_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_events_product_idx ON acquisition_events(product_id,event_type,occurred_at DESC);
