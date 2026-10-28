-- QUICK FIX for infinite recursion in RLS policies
-- This script addresses the immediate "infinite recursion" error

-- ============================================================================
-- 1. Drop problematic profiles policies causing infinite recursion
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;  
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- ============================================================================
-- 2. Create simple, non-recursive profiles policies
-- ============================================================================

-- Allow users to see their own profile and admins to see all profiles
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  -- Users can see their own profile
  auth.uid() = user_id
  OR
  -- Admin users can see all profiles (using direct check to avoid recursion)
  user_id = auth.uid() AND is_admin = true
  OR
  -- If current user is admin, they can see all profiles
  EXISTS (
    SELECT 1 FROM profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.is_admin = true
    AND p2.user_id != profiles.user_id  -- Prevent self-reference recursion
  )
);

-- Users can only create their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Users can update their own profile, admins can update any
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.is_admin = true
    AND p2.user_id != profiles.user_id  -- Prevent self-reference recursion
  )
);

-- Only admins can delete profiles
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.is_admin = true
    AND p2.user_id != profiles.user_id  -- Prevent self-reference recursion
  )
);

-- ============================================================================
-- 3. Ensure RLS is enabled
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;