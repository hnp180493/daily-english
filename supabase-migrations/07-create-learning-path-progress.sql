-- Create learning_path_progress table
-- This table stores user progress through learning paths and modules
-- Requirements: 1.5, 6.1

CREATE TABLE IF NOT EXISTS learning_path_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_path_id VARCHAR(50) NOT NULL,
  current_module_id VARCHAR(50) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_modules TEXT[] DEFAULT '{}',
  module_progress JSONB DEFAULT '{}',
  path_completions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_path_progress UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_learning_path_progress_user_id ON learning_path_progress(user_id);

-- Create index on current_path_id for analytics
CREATE INDEX IF NOT EXISTS idx_learning_path_progress_path_id ON learning_path_progress(current_path_id);

-- Add comment to table
COMMENT ON TABLE learning_path_progress IS 'Tracks user progress through learning paths and modules';
COMMENT ON COLUMN learning_path_progress.module_progress IS 'JSON object mapping module IDs to progress data';
COMMENT ON COLUMN learning_path_progress.path_completions IS 'JSON array of completed path records with dates and scores';
