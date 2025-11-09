-- =====================================================
-- Row Level Security (RLS) Policies
-- Migration: Enable RLS and Create Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Users Table Policies
-- =====================================================

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- User Progress Policies
-- =====================================================

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- User Favorites Policies
-- =====================================================

CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Custom Exercises Policies
-- =====================================================

CREATE POLICY "Users can view own exercises"
  ON custom_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises"
  ON custom_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
  ON custom_exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
  ON custom_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- User Achievements Policies
-- =====================================================

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- User Rewards Policies
-- =====================================================

CREATE POLICY "Users can view own rewards"
  ON user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
  ON user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
  ON user_rewards FOR UPDATE
  USING (auth.uid() = user_id);
