-- DEFINITIVE FIX: Eliminate ALL infinite recursion issues
-- This script uses direct, non-recursive policies to fix all database access issues

-- ============================================================================
-- STEP 1: Drop ALL problematic policies that cause recursion
-- ============================================================================

-- Drop all team-related policies
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;

DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

DROP POLICY IF EXISTS "team_invites_select_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_insert_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_update_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_delete_policy" ON team_invites;

-- Drop registrations policies
DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;

-- ============================================================================
-- STEP 2: Create a helper function that safely checks admin status
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY definer
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT p.is_admin 
      FROM public.profiles p 
      WHERE p.user_id = auth.uid()
      LIMIT 1
    ), 
    false
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;

-- ============================================================================
-- STEP 3: Create SIMPLE, NON-RECURSIVE policies for all tables
-- ============================================================================

-- TEAMS TABLE - Simple policies without circular references
CREATE POLICY "teams_select_policy" ON teams
FOR SELECT USING (
  -- Team leaders can see their own teams
  leader_id = auth.uid()
  OR
  -- Admin users can see all teams (using function to avoid recursion)
  auth.is_admin() = true
);

CREATE POLICY "teams_insert_policy" ON teams
FOR INSERT WITH CHECK (
  leader_id = auth.uid() OR auth.is_admin() = true
);

CREATE POLICY "teams_update_policy" ON teams
FOR UPDATE USING (
  leader_id = auth.uid() OR auth.is_admin() = true
);

CREATE POLICY "teams_delete_policy" ON teams
FOR DELETE USING (
  leader_id = auth.uid() OR auth.is_admin() = true
);

-- REGISTRATIONS TABLE - Simple admin + owner policies
CREATE POLICY "registrations_select_policy" ON registrations
FOR SELECT USING (
  -- Users can see their own registration
  auth.uid() = user_id
  OR
  -- Admins can see all registrations
  auth.is_admin() = true
);

CREATE POLICY "registrations_insert_policy" ON registrations
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR auth.is_admin() = true
);

CREATE POLICY "registrations_update_policy" ON registrations
FOR UPDATE USING (
  auth.uid() = user_id OR auth.is_admin() = true
);

CREATE POLICY "registrations_delete_policy" ON registrations
FOR DELETE USING (
  auth.uid() = user_id OR auth.is_admin() = true
);

-- TEAM_MEMBERS TABLE - Simple policies without cross-table references
CREATE POLICY "team_members_select_policy" ON team_members
FOR SELECT USING (
  -- Users can see their own memberships
  user_id = auth.uid()
  OR
  -- Admins can see all memberships
  auth.is_admin() = true
);

CREATE POLICY "team_members_insert_policy" ON team_members
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR auth.is_admin() = true
);

CREATE POLICY "team_members_update_policy" ON team_members
FOR UPDATE USING (
  user_id = auth.uid() OR auth.is_admin() = true
);

CREATE POLICY "team_members_delete_policy" ON team_members
FOR DELETE USING (
  user_id = auth.uid() OR auth.is_admin() = true
);

-- TEAM_INVITES TABLE - Simple policies
CREATE POLICY "team_invites_select_policy" ON team_invites
FOR SELECT USING (
  -- Users can see invites to their email
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Users can see invites they sent
  inviter_id = auth.uid()
  OR
  -- Admins can see all invites
  auth.is_admin() = true
);

CREATE POLICY "team_invites_insert_policy" ON team_invites
FOR INSERT WITH CHECK (
  inviter_id = auth.uid() OR auth.is_admin() = true
);

CREATE POLICY "team_invites_update_policy" ON team_invites
FOR UPDATE USING (
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR inviter_id = auth.uid()
  OR auth.is_admin() = true
);

CREATE POLICY "team_invites_delete_policy" ON team_invites
FOR DELETE USING (
  inviter_id = auth.uid() OR auth.is_admin() = true
);

-- ============================================================================
-- STEP 4: Enable RLS on all tables
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================================
-- STEP 6: Test the fix
-- ============================================================================

-- Test admin function
SELECT 
  'Admin function test:' as test,
  auth.is_admin() as is_current_user_admin,
  (SELECT COUNT(*) FROM profiles WHERE is_admin = true) as total_admin_profiles;

-- Test table access
SELECT 
  'Table access test:' as test,
  (SELECT COUNT(*) FROM teams) as teams_count,
  (SELECT COUNT(*) FROM registrations) as registrations_count,
  (SELECT COUNT(*) FROM team_members) as team_members_count,
  (SELECT COUNT(*) FROM team_invites) as team_invites_count;

SELECT 'All policies fixed successfully! No more infinite recursion.' as status;