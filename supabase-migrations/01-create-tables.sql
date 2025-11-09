-- =====================================================
-- Supabase Database Schema for English Practice App
-- Migration: Create Tables
-- =====================================================

-- Users table (replaces Firebase Auth user data)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- User progress (replaces users/{userId}/data/progress)
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User favorites (replaces users/{userId}/data/favorites)
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Custom exercises (replaces users/{userId}/customExercises/{exerciseId})
CREATE TABLE IF NOT EXISTS custom_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (replaces users/{userId}/data/achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User rewards (replaces users/{userId}/data/rewards)
CREATE TABLE IF NOT EXISTS user_rewards (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  themes TEXT[] DEFAULT '{}',
  hints INTEGER DEFAULT 0,
  avatar_frames TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON custom_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_exercise_id ON user_favorites(exercise_id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_created_at ON custom_exercises(created_at DESC);

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE users IS 'User profiles synced from Supabase Auth';
COMMENT ON TABLE user_progress IS 'User learning progress data stored as JSONB';
COMMENT ON TABLE user_favorites IS 'User favorite exercises with timestamps';
COMMENT ON TABLE custom_exercises IS 'User-created custom exercises';
COMMENT ON TABLE user_achievements IS 'User achievements and milestones';
COMMENT ON TABLE user_rewards IS 'User rewards including themes, hints, and avatar frames';
