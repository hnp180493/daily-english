-- =====================================================
-- User Registration Limit Function
-- Migration: Create function to count total users
-- =====================================================

-- Function to count total users (bypasses RLS)
-- This is needed because users can only read their own data due to RLS
CREATE OR REPLACE FUNCTION get_total_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  RETURN user_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_total_user_count() TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION get_total_user_count() IS 'Returns total number of registered users, bypassing RLS restrictions';
