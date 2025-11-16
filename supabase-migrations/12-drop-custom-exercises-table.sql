-- =====================================================
-- Migration: Drop custom_exercises table
-- Description: Remove custom_exercises table as feature now uses localStorage only
-- Date: 2024-11-16
-- =====================================================

-- Drop realtime subscription for custom_exercises (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'custom_exercises'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE custom_exercises;
  END IF;
END $$;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can insert own exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can update own exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can delete own exercises" ON custom_exercises;

-- Drop indexes
DROP INDEX IF EXISTS idx_custom_exercises_user_id;
DROP INDEX IF EXISTS idx_custom_exercises_created_at;

-- Drop table (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS custom_exercises CASCADE;

-- =====================================================
-- Notes:
-- - Custom exercises are now stored in localStorage only
-- - Users can export/import exercises as JSON for backup
-- - No cloud sync functionality
-- =====================================================
