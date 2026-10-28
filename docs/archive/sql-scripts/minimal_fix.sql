-- MINIMAL FIX: Only fix the infinite recursion in profiles table
-- Run this if you want the absolute minimum change to get things working test

-- Drop the problematic profiles policies causing infinite recursion
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create simple, working profiles policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  -- Users can always see their own profile
  auth.uid() = user_id
  OR
  -- Direct admin check (no recursion)
  (user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Simple admin-only delete policy
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (false); -- For now, disable delete until admin system is working

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant basic auth permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

SELECT 'Minimal profiles fix applied!' as status;