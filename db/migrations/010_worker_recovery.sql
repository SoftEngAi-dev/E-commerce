ALTER TABLE jobs ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_id TEXT;
CREATE INDEX IF NOT EXISTS jobs_stale_idx ON jobs(status,locked_at);

ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS claimed_by TEXT;
CREATE INDEX IF NOT EXISTS outbox_claim_idx ON outbox_events(published_at,claimed_at,created_at);
