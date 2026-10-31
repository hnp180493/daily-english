-- Create user_skill_data table
-- Generic per-user JSON blob store for client-side features that previously
-- lived only in localStorage: flashcards, reading/listening quiz progress,
-- writing drafts and attempts, grammar lessons learned.
-- One row per (user_id, data_key); the client does last-write-wins merging.

CREATE TABLE IF NOT EXISTS user_skill_data (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_key TEXT NOT NULL CHECK (char_length(data_key) BETWEEN 1 AND 64),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, data_key)
);

-- Keep a single blob reasonably small (~512 KB)
ALTER TABLE user_skill_data
  DROP CONSTRAINT IF EXISTS user_skill_data_size_check;
ALTER TABLE user_skill_data
  ADD CONSTRAINT user_skill_data_size_check CHECK (pg_column_size(data) < 524288);

ALTER TABLE user_skill_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own skill data" ON user_skill_data;
DROP POLICY IF EXISTS "Users can insert own skill data" ON user_skill_data;
DROP POLICY IF EXISTS "Users can update own skill data" ON user_skill_data;
DROP POLICY IF EXISTS "Users can delete own skill data" ON user_skill_data;

CREATE POLICY "Users can view own skill data"
  ON user_skill_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill data"
  ON user_skill_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill data"
  ON user_skill_data
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skill data"
  ON user_skill_data
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_skill_data IS 'Per-user JSON blobs synced from client-side skill features (flashcards, reading, listening, writing, grammar)';
