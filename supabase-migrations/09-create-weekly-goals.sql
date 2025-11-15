-- Create weekly_goals table
-- This table stores user-defined weekly exercise goals and achievement tracking
-- Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  target_exercises INTEGER NOT NULL,
  completed_exercises INTEGER DEFAULT 0,
  is_achieved BOOLEAN DEFAULT FALSE,
  bonus_points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_weekly_goal UNIQUE(user_id, week_start_date),
  CONSTRAINT valid_target_exercises CHECK (target_exercises >= 3 AND target_exercises <= 50),
  CONSTRAINT valid_completed_exercises CHECK (completed_exercises >= 0),
  CONSTRAINT valid_bonus_points CHECK (bonus_points_earned >= 0)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_id ON weekly_goals(user_id);

-- Create index on week_start_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week_start ON weekly_goals(week_start_date);

-- Create composite index for user and week queries
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week ON weekly_goals(user_id, week_start_date DESC);

-- Create index on achievement status for analytics
CREATE INDEX IF NOT EXISTS idx_weekly_goals_achieved ON weekly_goals(user_id, is_achieved);

-- Add comments to table
COMMENT ON TABLE weekly_goals IS 'Tracks user-defined weekly exercise goals and achievement status';
COMMENT ON COLUMN weekly_goals.week_start_date IS 'Monday of the week (00:00 local time)';
COMMENT ON COLUMN weekly_goals.target_exercises IS 'User-defined goal between 3 and 50 exercises per week';
COMMENT ON COLUMN weekly_goals.bonus_points_earned IS 'Bonus points awarded when goal is achieved (500 points)';
