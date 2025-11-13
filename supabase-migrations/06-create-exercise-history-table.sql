-- =====================================================
-- Exercise History Table
-- Migration: Create user_exercise_history table
-- =====================================================

-- Create the exercise history table
CREATE TABLE IF NOT EXISTS user_exercise_history (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  
  -- Timestamps
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Performance metrics
  final_score INTEGER NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  time_spent_seconds INTEGER NOT NULL CHECK (time_spent_seconds >= 0),
  hints_used INTEGER NOT NULL DEFAULT 0,
  
  -- Detailed attempt data (JSONB for flexibility)
  sentence_attempts JSONB NOT NULL,
  penalty_metrics JSONB NOT NULL
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Index for user-specific queries
CREATE INDEX idx_user_exercise_history_user_id 
  ON user_exercise_history(user_id);

-- Index for recent history queries (sorted by completion date)
CREATE INDEX idx_user_exercise_history_completed_at 
  ON user_exercise_history(user_id, completed_at DESC);

-- Index for exercise-specific queries
CREATE INDEX idx_user_exercise_history_exercise_id 
  ON user_exercise_history(exercise_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on user_exercise_history table
ALTER TABLE user_exercise_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own exercise history
CREATE POLICY "Users can view own history"
  ON user_exercise_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own exercise history
CREATE POLICY "Users can insert own history"
  ON user_exercise_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies - history records are immutable
