-- =====================================================
-- Row Level Security (RLS) Policies for Reviews
-- Migration: Enable RLS for user_reviews table
-- =====================================================

-- Enable RLS on user_reviews table
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- User Reviews Policies
-- =====================================================

-- Users can view their own review data
CREATE POLICY "Users can view own reviews"
  ON user_reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own review data
CREATE POLICY "Users can insert own reviews"
  ON user_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own review data
CREATE POLICY "Users can update own reviews"
  ON user_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own review data
CREATE POLICY "Users can delete own reviews"
  ON user_reviews FOR DELETE
  USING (auth.uid() = user_id);

