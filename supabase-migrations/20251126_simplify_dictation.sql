-- Migration: Simplify dictation data - only keep attempt count
-- Date: 2025-11-26
-- Goal: Remove all dictation details, only keep attemptNumber (completion count)

CREATE OR REPLACE FUNCTION simplify_dictation_data()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  compressed_data jsonb;
  exercise_key text;
  exercise_data jsonb;
  compressed_exercise jsonb;
  compressed_history jsonb;
BEGIN
  FOR user_record IN SELECT user_id, data FROM user_progress LOOP
    compressed_data := user_record.data;
    compressed_history := '{}'::jsonb;
    
    IF user_record.data ? 'exerciseHistory' THEN
      FOR exercise_key, exercise_data IN 
        SELECT * FROM jsonb_each(user_record.data->'exerciseHistory')
      LOOP
        compressed_exercise := exercise_data;
        
        -- Simplify dictation (di) - only keep attemptNumber
        IF exercise_data ? 'di' THEN
          compressed_exercise := jsonb_set(
            compressed_exercise,
            '{di}',
            jsonb_build_object(
              'a', exercise_data->'di'->'a'  -- Only attemptNumber
              -- Removed: t, tt, oa, ts, ps, sa (all details)
            )
          );
        END IF;
        
        compressed_history := compressed_history || jsonb_build_object(exercise_key, compressed_exercise);
      END LOOP;
      
      compressed_data := jsonb_set(compressed_data, '{exerciseHistory}', compressed_history);
    END IF;
    
    UPDATE user_progress
    SET data = compressed_data
    WHERE user_id = user_record.user_id;
    
    RAISE NOTICE 'Simplified dictation data for user: %', user_record.user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute simplification
SELECT simplify_dictation_data();

-- Verify results
SELECT 
  user_id,
  pg_column_size(data) as size_after_simplify,
  (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id) as size_original,
  (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id) - pg_column_size(data) as total_saved,
  ROUND(((SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id)::numeric - pg_column_size(data)::numeric) / 
        (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id)::numeric * 100, 2) as percent_saved
FROM user_progress up;

-- Drop function
DROP FUNCTION simplify_dictation_data();
