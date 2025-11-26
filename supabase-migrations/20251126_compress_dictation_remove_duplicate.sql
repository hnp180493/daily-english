-- Migration: Remove duplicate 'original' field in dictation sentence attempts
-- Date: 2025-11-26
-- Goal: Remove 'o' (original) field since it's duplicate of 'u' (userInput)

CREATE OR REPLACE FUNCTION compress_dictation_remove_duplicate()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  compressed_data jsonb;
  exercise_key text;
  exercise_data jsonb;
  compressed_exercise jsonb;
  compressed_history jsonb;
  sentence_attempts jsonb;
  compressed_sa jsonb;
  sa_item jsonb;
BEGIN
  FOR user_record IN SELECT user_id, data FROM user_progress LOOP
    compressed_data := user_record.data;
    compressed_history := '{}'::jsonb;
    
    IF user_record.data ? 'exerciseHistory' THEN
      FOR exercise_key, exercise_data IN 
        SELECT * FROM jsonb_each(user_record.data->'exerciseHistory')
      LOOP
        compressed_exercise := exercise_data;
        
        -- Only process dictation (di)
        IF exercise_data ? 'di' THEN
          sentence_attempts := exercise_data->'di'->'sa';
          
          IF sentence_attempts IS NOT NULL AND jsonb_array_length(sentence_attempts) > 0 THEN
            compressed_sa := '[]'::jsonb;
            
            FOR sa_item IN SELECT * FROM jsonb_array_elements(sentence_attempts)
            LOOP
              -- Remove 'o' (original), keep only essential fields
              compressed_sa := compressed_sa || jsonb_build_array(
                jsonb_build_object(
                  'i', sa_item->'i',           -- sentenceIndex
                  'u', sa_item->'u',           -- userInput (keep this, it's the answer)
                  'a', sa_item->'a',           -- accuracyScore
                  'att', sa_item->'att',       -- attempts
                  'c', sa_item->'c'            -- isCompleted
                  -- Removed: 'o' (original) - duplicate of userInput with different case
                )
              );
            END LOOP;
            
            -- Update di with compressed sa
            compressed_exercise := jsonb_set(
              compressed_exercise,
              '{di,sa}',
              compressed_sa
            );
          END IF;
        END IF;
        
        compressed_history := compressed_history || jsonb_build_object(exercise_key, compressed_exercise);
      END LOOP;
      
      compressed_data := jsonb_set(compressed_data, '{exerciseHistory}', compressed_history);
    END IF;
    
    UPDATE user_progress
    SET data = compressed_data
    WHERE user_id = user_record.user_id;
    
    RAISE NOTICE 'Removed duplicate original field for user: %', user_record.user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute compression
SELECT compress_dictation_remove_duplicate();

-- Verify results
SELECT 
  user_id,
  pg_column_size(data) as size_after_remove_duplicate,
  (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id) as size_original,
  (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id) - pg_column_size(data) as total_saved,
  ROUND(((SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id)::numeric - pg_column_size(data)::numeric) / 
        (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id)::numeric * 100, 2) as percent_saved
FROM user_progress up;

-- Drop function
DROP FUNCTION compress_dictation_remove_duplicate();
