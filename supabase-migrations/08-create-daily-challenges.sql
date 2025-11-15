-- Create daily_challenges table
-- This table stores daily challenge assignments and completion status
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  exercise_id VARCHAR(50) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  bonus_points INTEGER DEFAULT 0,
  is_weekend_challenge BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_daily_challenge UNIQUE(user_id, date),
  CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT valid_bonus_points CHECK (bonus_points >= 0)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_id ON daily_challenges(user_id);

-- Create index on date for date-based queries
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(date);

-- Create composite index for user and date queries
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, date DESC);

-- Create index on completion status for analytics
CREATE INDEX IF NOT EXISTS idx_daily_challenges_completed ON daily_challenges(user_id, is_completed);

-- Add comments to table
COMMENT ON TABLE daily_challenges IS 'Stores daily challenge assignments and completion tracking';
COMMENT ON COLUMN daily_challenges.is_weekend_challenge IS 'True if challenge was assigned on Saturday or Sunday (2x bonus points)';
COMMENT ON COLUMN daily_challenges.bonus_points IS 'Additional points earned from streak multipliers or weekend challenges';
