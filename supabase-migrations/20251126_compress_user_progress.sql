-- Migration: Compress user_progress.data
-- Date: 2025-11-26
-- Goal: Reduce JSON size from 27KB to ~3KB by using short keys
-- IMPORTANT: All data is preserved, only field names are shortened

-- Function to compress exerciseHistory and dictationHistory
CREATE OR REPLACE FUNCTION compress_user_progress_data()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  compressed_data jsonb;
  exercise_key text;
  exercise_data jsonb;
  compressed_exercise jsonb;
  compressed_history jsonb;
BEGIN
  -- Loop through all users
  FOR user_record IN SELECT user_id, data FROM user_progress LOOP
    
    -- Start with base data (keep summary fields as-is)
    compressed_data := jsonb_build_object(
      'totalPoints', user_record.data->'totalPoints',
      'totalCredits', user_record.data->'totalCredits',
      'currentStreak', user_record.data->'currentStreak',
      'longestStreak', user_record.data->'longestStreak',
      'lastStreakDate', user_record.data->'lastStreakDate',
      'achievements', user_record.data->'achievements',
      'lastActivityDate', user_record.data->'lastActivityDate',
      'exerciseHistory', '{}'::jsonb
    );
    
    compressed_history := '{}'::jsonb;
    
    -- Compress exerciseHistory (translation attempts)
    IF user_record.data ? 'exerciseHistory' THEN
      FOR exercise_key, exercise_data IN 
        SELECT * FROM jsonb_each(user_record.data->'exerciseHistory')
      LOOP
        -- Compress with short keys but KEEP ALL DATA
        compressed_exercise := jsonb_build_object(
          'tr', jsonb_build_object(
            'a', exercise_data->'attemptNumber',
            't', exercise_data->'timestamp',
            'l', exercise_data->'level',
            'c', exercise_data->'category',
            's', exercise_data->'accuracyScore',
            'bs', exercise_data->'baseScore',
            'p', exercise_data->'pointsEarned',
            'h', exercise_data->'hintsUsed',
            'tp', exercise_data->'totalPenalty',
            'tr', exercise_data->'totalRetries',
            'ia', exercise_data->'totalIncorrectAttempts',
            'ui', exercise_data->'userInput',
            'sa', exercise_data->'sentenceAttempts'
          )
        );
        
        compressed_history := compressed_history || jsonb_build_object(exercise_key, compressed_exercise);
      END LOOP;
    END IF;
    
    -- Compress dictationHistory and merge into exerciseHistory
    IF user_record.data ? 'dictationHistory' THEN
      FOR exercise_key, exercise_data IN 
        SELECT * FROM jsonb_each(user_record.data->'dictationHistory')
      LOOP
        -- Check if exercise already exists (has translation)
        IF compressed_history ? exercise_key THEN
          -- Add dictation to existing exercise
          compressed_history := jsonb_set(
            compressed_history,
            ARRAY[exercise_key, 'di'],
            jsonb_build_object(
              'a', exercise_data->'attemptNumber',
              't', exercise_data->'timestamp',
              'tt', exercise_data->'translatedText',
              'oa', exercise_data->'overallAccuracy',
              'ts', exercise_data->'timeSpent',
              'ps', exercise_data->'playbackSpeed',
              'sa', exercise_data->'sentenceAttempts'
            )
          );
        ELSE
          -- Create new exercise with only dictation
          compressed_history := compressed_history || jsonb_build_object(
            exercise_key,
            jsonb_build_object(
              'di', jsonb_build_object(
                'a', exercise_data->'attemptNumber',
                't', exercise_data->'timestamp',
                'tt', exercise_data->'translatedText',
                'oa', exercise_data->'overallAccuracy',
                'ts', exercise_data->'timeSpent',
                'ps', exercise_data->'playbackSpeed',
                'sa', exercise_data->'sentenceAttempts'
              )
            )
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Set compressed exerciseHistory
    compressed_data := jsonb_set(compressed_data, '{exerciseHistory}', compressed_history);
    
    -- Update user_progress with compressed data
    UPDATE user_progress
    SET data = compressed_data
    WHERE user_id = user_record.user_id;
    
    RAISE NOTICE 'Compressed data for user: %', user_record.user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute compression
SELECT compress_user_progress_data();

-- Verify compression results
SELECT 
  user_id,
  pg_column_size(data) as size_bytes,
  jsonb_object_keys(data->'exerciseHistory') as exercise_count
FROM user_progress;

-- Drop function after use
DROP FUNCTION compress_user_progress_data();
