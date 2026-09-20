CREATE TABLE IF NOT EXISTS knowledge_documents(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source,external_id)
);

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple',coalesce(title,'') || ' ' || coalesce(content,''))) STORED;

CREATE INDEX IF NOT EXISTS knowledge_documents_search_idx ON knowledge_documents USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS agent_memory(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  importance NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK(importance>=0 AND importance<=100),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agent_memory_agent_idx ON agent_memory(agent,importance DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS agent_memory_search_idx ON agent_memory USING GIN(to_tsvector('simple',content));
