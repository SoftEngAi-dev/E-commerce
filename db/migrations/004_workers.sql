ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5 CHECK(max_attempts>0);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_id TEXT;
CREATE INDEX IF NOT EXISTS jobs_claim_idx ON jobs(status,available_at,created_at);
ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS outbox_publish_idx ON outbox_events(published_at,created_at);
