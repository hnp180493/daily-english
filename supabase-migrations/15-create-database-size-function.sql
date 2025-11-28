-- =====================================================
-- Database Size Limit Function
-- Migration: Create function to check database size
-- =====================================================

-- Function to get total database size in MB
-- This checks the actual storage used by all tables
CREATE OR REPLACE FUNCTION get_database_size_mb()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
  size_mb NUMERIC;
BEGIN
  -- Get total size of all tables in the public schema
  SELECT 
    ROUND(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))::numeric / (1024 * 1024), 2)
  INTO size_mb
  FROM pg_tables
  WHERE schemaname = 'public';
  
  RETURN COALESCE(size_mb, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size_mb() TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION get_database_size_mb() IS 'Returns total database size in MB for all public schema tables';
