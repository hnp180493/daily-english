-- Enable Row Level Security (RLS) for learning path tables
-- This ensures users can only access their own data
-- Requirements: 1.5, 2.1, 3.1, 7.1

-- Enable RLS on all learning path tables
ALTER TABLE learning_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- learning_path_progress policies
-- ============================================================================

-- Allow users to view their own path progress
CREATE POLICY "Users can view own path progress"
  ON learning_path_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own path progress
CREATE POLICY "Users can insert own path progress"
  ON learning_path_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own path progress
CREATE POLICY "Users can update own path progress"
  ON learning_path_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- daily_challenges policies
-- ============================================================================

-- Allow users to view their own daily challenges
CREATE POLICY "Users can view own daily challenges"
  ON daily_challenges
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own daily challenges
CREATE POLICY "Users can insert own daily challenges"
  ON daily_challenges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own daily challenges
CREATE POLICY "Users can update own daily challenges"
  ON daily_challenges
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- weekly_goals policies
-- ============================================================================

-- Allow users to view their own weekly goals
CREATE POLICY "Users can view own weekly goals"
  ON weekly_goals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own weekly goals
CREATE POLICY "Users can insert own weekly goals"
  ON weekly_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own weekly goals
CREATE POLICY "Users can update own weekly goals"
  ON weekly_goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- notification_preferences policies
-- ============================================================================

-- Allow users to view their own notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own notification preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notification preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comments
COMMENT ON POLICY "Users can view own path progress" ON learning_path_progress IS 'Users can only view their own learning path progress';
COMMENT ON POLICY "Users can view own daily challenges" ON daily_challenges IS 'Users can only view their own daily challenges';
COMMENT ON POLICY "Users can view own weekly goals" ON weekly_goals IS 'Users can only view their own weekly goals';
COMMENT ON POLICY "Users can view own notification preferences" ON notification_preferences IS 'Users can only view their own notification preferences';
