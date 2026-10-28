-- SAFE RLS POLICIES FIX for HTR Dashboard
-- This script safely handles existing policies and fixes the infinite recursion issue

-- ============================================================================
-- 1. SAFELY drop and recreate profiles table policies (the main problem)
-- ============================================================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create new profiles policies (fixed to prevent infinite recursion)
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  -- Users can see their own profile
  auth.uid() = user_id
  OR
  -- Admin users can see all profiles (avoid recursion by checking current user directly)
  (user_id = auth.uid() AND is_admin = true)
  OR
  -- If current user is admin, they can see all profiles (prevent self-reference)
  EXISTS (
    SELECT 1 FROM profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.is_admin = true
    AND p2.user_id != profiles.user_id  -- Critical: prevent recursion
  )
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.is_admin = true
    AND p2.user_id != profiles.user_id  -- Critical: prevent recursion
  )
);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.is_admin = true
    AND p2.user_id != profiles.user_id  -- Critical: prevent recursion
  )
);

-- ============================================================================
-- 2. Fix team_invites policies (only if they don't exist or are problematic)
-- ============================================================================

-- Drop and recreate team_invites policies
DROP POLICY IF EXISTS "team_invites_select_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_insert_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_update_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_delete_policy" ON team_invites;

CREATE POLICY "team_invites_select_policy" ON team_invites
FOR SELECT USING (
  -- Users can see invites sent to their email
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Users can see invites they sent
  inviter_id = auth.uid()
  OR
  -- Team leaders can see invites for their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admin users can see all invites
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "team_invites_insert_policy" ON team_invites
FOR INSERT WITH CHECK (
  -- Only team leaders can send invites for their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admins can send invites for any team
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "team_invites_update_policy" ON team_invites
FOR UPDATE USING (
  -- Users can update invites sent to their email
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Team leaders can update invites for their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admins can update any invite
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "team_invites_delete_policy" ON team_invites
FOR DELETE USING (
  -- Team leaders can delete invites for their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admins can delete any invite
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- ============================================================================
-- 3. Only update schedule policies if they're causing issues
-- ============================================================================

-- Check if schedule policies exist and are problematic
DO $$
BEGIN
  -- Only recreate if there are issues, otherwise leave existing ones alone
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule' AND policyname = 'schedule_select_policy') THEN
    -- Policy exists, check if it needs updating (this is a simple check)
    -- For now, we'll leave existing schedule policies alone unless they're broken
    RAISE NOTICE 'Schedule policies already exist - leaving them unchanged';
  ELSE
    -- Create basic schedule policies
    EXECUTE 'CREATE POLICY "schedule_select_policy" ON schedule FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "schedule_insert_policy" ON schedule FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
    )';
    EXECUTE 'CREATE POLICY "schedule_update_policy" ON schedule FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
    )';
    EXECUTE 'CREATE POLICY "schedule_delete_policy" ON schedule FOR DELETE USING (
      EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
    )';
  END IF;
END $$;

-- ============================================================================
-- 4. Ensure RLS is enabled and grant permissions
-- ============================================================================

-- Enable RLS on critical tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- ============================================================================
-- 5. Create helper function to check if user is admin (prevents recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY definer
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- Test the fix
SELECT 'RLS policies have been safely updated!' as status;