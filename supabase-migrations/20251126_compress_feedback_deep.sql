-- Migration: Deep compress feedback in sentenceAttempts
-- Date: 2025-11-26
-- Goal: Compress feedback with short keys, remove empty arrays and redundant explanation

CREATE OR REPLACE FUNCTION compress_feedback_deep()
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
  feedback_array jsonb;
  compressed_feedback jsonb;
  fb_item jsonb;
BEGIN
  FOR user_record IN SELECT user_id, data FROM user_progress LOOP
    compressed_data := user_record.data;
    compressed_history := '{}'::jsonb;
    
    IF user_record.data ? 'exerciseHistory' THEN
      FOR exercise_key, exercise_data IN 
        SELECT * FROM jsonb_each(user_record.data->'exerciseHistory')
      LOOP
        compressed_exercise := exercise_data;
        
        -- Compress translation (tr)
        IF exercise_data ? 'tr' THEN
          sentence_attempts := exercise_data->'tr'->'sa';
          
          IF sentence_attempts IS NOT NULL AND jsonb_array_length(sentence_attempts) > 0 THEN
            compressed_sa := '[]'::jsonb;
            
            FOR sa_item IN SELECT * FROM jsonb_array_elements(sentence_attempts)
            LOOP
              feedback_array := sa_item->'feedback';
              
              -- Only include feedback if not empty
              IF feedback_array IS NOT NULL AND jsonb_array_length(feedback_array) > 0 THEN
                compressed_feedback := '[]'::jsonb;
                
                FOR fb_item IN SELECT * FROM jsonb_array_elements(feedback_array)
                LOOP
                  -- Compress feedback with short keys, remove redundant explanation
                  compressed_feedback := compressed_feedback || jsonb_build_array(
                    jsonb_build_object(
                      't', fb_item->'type',
                      's', fb_item->'suggestion',
                      'o', fb_item->'originalText'
                      -- Removed: explanation (always same), startIndex, endIndex (not used)
                    )
                  );
                END LOOP;
                
                -- Build compressed sentence attempt WITH feedback
                compressed_sa := compressed_sa || jsonb_build_array(
                  jsonb_build_object(
                    'i', sa_item->'sentenceIndex',
                    'u', sa_item->'userInput',
                    'a', sa_item->'accuracyScore',
                    'r', sa_item->'retryCount',
                    'ia', sa_item->'incorrectAttempts',
                    'f', compressed_feedback
                  )
                );
              ELSE
                -- Build compressed sentence attempt WITHOUT feedback (no empty array)
                compressed_sa := compressed_sa || jsonb_build_array(
                  jsonb_build_object(
                    'i', sa_item->'sentenceIndex',
                    'u', sa_item->'userInput',
                    'a', sa_item->'accuracyScore',
                    'r', sa_item->'retryCount',
                    'ia', sa_item->'incorrectAttempts'
                    -- No 'f' key if no feedback
                  )
                );
              END IF;
            END LOOP;
            
            -- Update tr with compressed sa
            compressed_exercise := jsonb_set(
              compressed_exercise,
              '{tr,sa}',
              compressed_sa
            );
          END IF;
        END IF;
        
        -- Compress dictation (di) - similar logic
        IF exercise_data ? 'di' THEN
          sentence_attempts := exercise_data->'di'->'sa';
          
          IF sentence_attempts IS NOT NULL AND jsonb_array_length(sentence_attempts) > 0 THEN
            compressed_sa := '[]'::jsonb;
            
            FOR sa_item IN SELECT * FROM jsonb_array_elements(sentence_attempts)
            LOOP
              -- Dictation has different structure (feedback object, not array)
              compressed_sa := compressed_sa || jsonb_build_array(
                jsonb_build_object(
                  'i', sa_item->'sentenceIndex',
                  'o', sa_item->'original',
                  'u', sa_item->'userInput',
                  'a', sa_item->'accuracyScore',
                  'att', sa_item->'attempts',
                  'c', sa_item->'isCompleted'
                  -- Removed: feedback (too complex for dictation, can be recalculated)
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
    
    RAISE NOTICE 'Deep compressed feedback for user: %', user_record.user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute deep compression
SELECT compress_feedback_deep();

-- Verify results
SELECT 
  user_id,
  pg_column_size(data) as size_after_deep_compression,
  (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id) as size_original,
  pg_column_size(data) - (SELECT pg_column_size(data) FROM user_progress_backup_20251126 WHERE user_id = up.user_id) as total_saved
FROM user_progress up;

-- Drop function
DROP FUNCTION compress_feedback_deep();
