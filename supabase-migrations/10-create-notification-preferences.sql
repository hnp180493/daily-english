-- Create notification_preferences table
-- This table stores user notification settings and preferences
-- Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  reminder_time TIME DEFAULT '19:00:00',
  daily_challenge_reminder BOOLEAN DEFAULT TRUE,
  goal_progress_reminder BOOLEAN DEFAULT TRUE,
  streak_reminder BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_notification_prefs UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create index on enabled status for filtering active users
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled ON notification_preferences(enabled);

-- Add comments to table
COMMENT ON TABLE notification_preferences IS 'Stores user notification settings and reminder preferences';
COMMENT ON COLUMN notification_preferences.enabled IS 'Master switch for all notifications';
COMMENT ON COLUMN notification_preferences.reminder_time IS 'Preferred time for daily challenge reminders (default 19:00)';
COMMENT ON COLUMN notification_preferences.daily_challenge_reminder IS 'Enable/disable daily challenge notifications';
COMMENT ON COLUMN notification_preferences.goal_progress_reminder IS 'Enable/disable weekly goal progress notifications';
COMMENT ON COLUMN notification_preferences.streak_reminder IS 'Enable/disable streak milestone notifications';
