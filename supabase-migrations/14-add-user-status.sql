-- =====================================================
-- Add Status Column to Users Table
-- Migration: Add user status for account management
-- =====================================================

-- Add status column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive'));

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Comment for documentation
COMMENT ON COLUMN users.status IS 'User account status: Active or Inactive. Inactive users cannot login.';

-- =====================================================
-- Update RLS Policy to Prevent Users from Changing Status
-- =====================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new update policy that excludes status field
-- Users can only update email, display_name, photo_url, and last_login
-- Status can only be changed by service role (admin)
CREATE POLICY "Users can update own profile except status"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Ensure status hasn't changed (compare with old value)
    status = (SELECT status FROM users WHERE id = auth.uid())
  );
