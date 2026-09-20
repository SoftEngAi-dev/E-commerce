CREATE TABLE IF NOT EXISTS fulfillment_attempts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  idempotency_key TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}',
  response_payload JSONB,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider,idempotency_key),
  UNIQUE(provider,external_id)
);

CREATE INDEX IF NOT EXISTS fulfillment_attempts_order_idx ON fulfillment_attempts(order_id,created_at DESC);

CREATE TABLE IF NOT EXISTS decision_outcomes(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  context JSONB NOT NULL,
  outcome TEXT NOT NULL,
  value NUMERIC(14,4),
  evidence JSONB NOT NULL DEFAULT '[]',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decision_outcomes_type_idx ON decision_outcomes(decision_type,occurred_at DESC);

CREATE TABLE IF NOT EXISTS learning_examples(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_outcome_id UUID REFERENCES decision_outcomes(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  input JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  quality_score NUMERIC(5,2) NOT NULL CHECK(quality_score>=0 AND quality_score<=100),
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(budget>=0),
  currency CHAR(3) NOT NULL,
  policy JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  ai_draft JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_policies(
  market TEXT PRIMARY KEY,
  currency CHAR(3) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  tax_mode TEXT NOT NULL DEFAULT 'external',
  allowed_channels JSONB NOT NULL DEFAULT '[]',
  blocked_categories JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
