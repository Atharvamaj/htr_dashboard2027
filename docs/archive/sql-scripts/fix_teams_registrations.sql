-- FIX TEAMS AND REGISTRATIONS ACCESS FOR ADMIN USERS
-- This script addresses the "failed to load teams" and registration issues

-- ============================================================================
-- 1. Fix teams table policies
-- ============================================================================

-- Drop existing teams policies
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;

-- Create new teams policies
CREATE POLICY "teams_select_policy" ON teams
FOR SELECT USING (
  -- Team leaders can see their own teams
  leader_id = auth.uid()
  OR
  -- Team members can see teams they're in
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = teams.id 
    AND user_id = auth.uid()
  )
  OR
  -- Users can see teams they've been invited to
  EXISTS (
    SELECT 1 FROM team_invites 
    WHERE team_id = teams.id 
    AND invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR
  -- CRITICAL: Admin users can see all teams
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "teams_insert_policy" ON teams
FOR INSERT WITH CHECK (
  -- Users can create teams where they are the leader
  leader_id = auth.uid()
  OR
  -- Admins can create teams for any user
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "teams_update_policy" ON teams
FOR UPDATE USING (
  -- Team leaders can update their own teams
  leader_id = auth.uid()
  OR
  -- Admins can update any team
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "teams_delete_policy" ON teams
FOR DELETE USING (
  -- Team leaders can delete their own teams
  leader_id = auth.uid()
  OR
  -- Admins can delete any team
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- ============================================================================
-- 2. Fix registrations table policies
-- ============================================================================

-- Drop existing registrations policies
DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;

-- Create new registrations policies
CREATE POLICY "registrations_select_policy" ON registrations
FOR SELECT USING (
  -- Users can see their own registration
  auth.uid() = user_id
  OR
  -- CRITICAL: Admin users can see all registrations
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
  OR
  -- Team members can see each other's registrations (for team management)
  EXISTS (
    SELECT 1 FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid()
    AND tm2.user_id = registrations.user_id
  )
);

CREATE POLICY "registrations_insert_policy" ON registrations
FOR INSERT WITH CHECK (
  -- Users can only create their own registration
  auth.uid() = user_id
  OR
  -- Admins can create registrations for anyone
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "registrations_update_policy" ON registrations
FOR UPDATE USING (
  -- Users can update their own registration
  auth.uid() = user_id
  OR
  -- Admins can update any registration
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "registrations_delete_policy" ON registrations
FOR DELETE USING (
  -- Admins can delete any registration
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
  OR
  -- Users can delete their own registration
  auth.uid() = user_id
);

-- ============================================================================
-- 3. Fix team_members table policies (needed for team functionality)
-- ============================================================================

-- Drop existing team_members policies
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Create new team_members policies
CREATE POLICY "team_members_select_policy" ON team_members
FOR SELECT USING (
  -- Users can see their own team memberships
  user_id = auth.uid()
  OR
  -- Users can see other members of teams they're in
  EXISTS (
    SELECT 1 FROM team_members tm2
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
  )
  OR
  -- Team leaders can see all members of their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admin users can see all team memberships
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "team_members_insert_policy" ON team_members
FOR INSERT WITH CHECK (
  -- Users can add themselves to teams (via invite acceptance)
  user_id = auth.uid()
  OR
  -- Team leaders can add members to their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admins can add any user to any team
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "team_members_update_policy" ON team_members
FOR UPDATE USING (
  -- Users can update their own membership status
  user_id = auth.uid()
  OR
  -- Team leaders can update memberships in their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admins can update any membership
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "team_members_delete_policy" ON team_members
FOR DELETE USING (
  -- Users can remove themselves from teams
  user_id = auth.uid()
  OR
  -- Team leaders can remove members from their teams
  EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_id 
    AND leader_id = auth.uid()
  )
  OR
  -- Admins can remove any user from any team
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- ============================================================================
-- 4. Enable RLS on all tables
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Test query to verify admin can see data
-- ============================================================================

-- Test if current user can see teams and registrations
SELECT 
  'Admin access test results:' as test_type,
  (SELECT COUNT(*) FROM teams) as teams_visible,
  (SELECT COUNT(*) FROM registrations) as registrations_visible,
  (SELECT COUNT(*) FROM team_members) as team_members_visible,
  (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) as current_user_is_admin;

SELECT 'Teams and registrations policies updated successfully!' as status;