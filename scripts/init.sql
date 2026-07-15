-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Handbook chunks for RAG
CREATE TABLE IF NOT EXISTS handbook_chunks (
  id          SERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  section_num TEXT NOT NULL,
  section_title TEXT NOT NULL,
  embedding   vector(768),          -- Gemini text-embedding-004 dimension
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS handbook_chunks_embedding_idx
  ON handbook_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Conversation sessions
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,     -- thread_ts for Slack, UUID for CLI
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Conversation messages
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,        -- always PII-masked before insert
  intent      TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Auto-update sessions.updated_at
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions SET updated_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_session
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_session_timestamp();

-- Security audit log (blocked/injection attempts)
CREATE TABLE IF NOT EXISTS security_log (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT,
  reason      TEXT NOT NULL,        -- 'blocked_topic' | 'injection'
  raw_input   TEXT NOT NULL,        -- masked version of the flagged input
  created_at  TIMESTAMP DEFAULT NOW()
);
