-- =====================================================
-- Enable Realtime Replication
-- Migration: Enable Realtime for Required Tables
-- =====================================================

-- Enable realtime for user_progress table
ALTER PUBLICATION supabase_realtime ADD TABLE user_progress;

-- Enable realtime for user_favorites table
ALTER PUBLICATION supabase_realtime ADD TABLE user_favorites;

-- Enable realtime for custom_exercises table
ALTER PUBLICATION supabase_realtime ADD TABLE custom_exercises;

-- Note: Realtime is enabled for tables that need real-time synchronization
-- across multiple devices or browser tabs. Other tables (users, achievements, 
-- rewards) don't require realtime as they're updated less frequently.
