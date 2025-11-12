-- =====================================================
-- Supabase Database Schema for English Practice App
-- Migration: Create Reviews Table
-- =====================================================

-- User reviews (spaced repetition data for exercises)
CREATE TABLE IF NOT EXISTS user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Index for querying reviews by user
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id ON user_reviews(user_id);

-- Index for querying reviews by exercise
CREATE INDEX IF NOT EXISTS idx_user_reviews_exercise_id ON user_reviews(exercise_id);

-- Index for querying reviews by next review date (for due reviews)
CREATE INDEX IF NOT EXISTS idx_user_reviews_next_review_date 
  ON user_reviews((data->>'nextReviewDate'));

-- Composite index for user + next review date queries
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_next_review 
  ON user_reviews(user_id, ((data->>'nextReviewDate')));

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE user_reviews IS 'Spaced repetition review data for exercises';
COMMENT ON COLUMN user_reviews.data IS 'JSONB containing ReviewData: easinessFactor, interval, nextReviewDate, reviewHistory, etc.';

