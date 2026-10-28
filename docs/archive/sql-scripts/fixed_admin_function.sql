-- FIXED ADMIN FUNCTION
-- This fixes the type mismatch error

-- ============================================================================
-- 1. First, let's check the actual column types in our tables
-- ============================================================================

SELECT 'Checking profiles table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- ============================================================================
-- 2. Create the corrected function with proper type handling
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_users_for_admin();

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE(
  id UUID,
  email TEXT,
  created_at TEXT,  -- Changed to TEXT to handle any timestamp format
  last_sign_in_at TEXT,  -- Changed to TEXT 
  is_admin BOOLEAN,
  full_name TEXT
)
LANGUAGE sql
SECURITY definer
AS $$
  SELECT 
    p.user_id as id,
    p.email,
    p.created_at::TEXT as created_at,  -- Convert to text
    NULL::TEXT as last_sign_in_at,     -- NULL as text
    COALESCE(p.is_admin, false) as is_admin,  -- Handle null values
    p.full_name
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.is_admin = true
  )
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;

-- ============================================================================
-- 3. Alternative simpler function that just returns basic info
-- ============================================================================

CREATE OR REPLACE FUNCTION get_users_simple()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN,
  registration_count INTEGER
)
LANGUAGE sql
SECURITY definer
AS $$
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    COALESCE(p.is_admin, false) as is_admin,
    (SELECT COUNT(*)::INTEGER FROM registrations r WHERE r.user_id = p.user_id) as registration_count
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.is_admin = true
  )
  ORDER BY p.email;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_users_simple() TO authenticated;

-- ============================================================================
-- 4. Test both functions
-- ============================================================================

SELECT 'Testing fixed admin function:' as test;
-- This should work now
SELECT * FROM get_all_users_for_admin() LIMIT 3;

SELECT 'Testing simple user function:' as test;
SELECT * FROM get_users_simple() LIMIT 3;

SELECT 'Functions created successfully!' as status;