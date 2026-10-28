-- Fix RLS Policies for HTR Dashboard
-- This script addresses the following issues:
-- 1. Admin users can't see all users in AdminUsers component
-- 2. 403 permission denied errors when loading team invites
-- 3. Ensures proper access control while maintaining security

-- ============================================================================
-- 1. Fix profiles table RLS policies
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create new profiles policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  -- Users can see their own profile
  auth.uid() = user_id
  OR
  -- Admin users can see all profiles
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
  OR
  -- Users can see profiles of people in their teams
  EXISTS (
    SELECT 1 FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid()
    AND tm2.user_id = profiles.user_id
  )
  OR
  -- Users can see profiles of team leaders who invited them
  EXISTS (
    SELECT 1 FROM team_invites ti
    JOIN teams t ON ti.team_id = t.id
    WHERE ti.invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND t.leader_id = profiles.user_id
  )
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT WITH CHECK (
  -- Users can only create their own profile
  auth.uid() = user_id
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (
  -- Users can update their own profile
  auth.uid() = user_id
  OR
  -- Admins can update any profile
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE USING (
  -- Only admins can delete profiles
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- ============================================================================
-- 2. Fix registrations table RLS policies
-- ============================================================================

-- Drop existing policies to recreate them
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
  -- Admin users can see all registrations
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
);

-- ============================================================================
-- 3. Fix team_invites table RLS policies
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "team_invites_select_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_insert_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_update_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_delete_policy" ON team_invites;

-- Create new team_invites policies
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
  -- Users can update invites sent to their email (accepting/declining)
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
-- 4. Fix team_members table RLS policies
-- ============================================================================

-- Drop existing policies to recreate them
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
    SELECT 1 FROM team_members 
    WHERE team_id = team_members.team_id 
    AND user_id = auth.uid()
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
-- 5. Fix teams table RLS policies
-- ============================================================================

-- Drop existing policies to recreate them
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
  -- Admin users can see all teams
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
-- 6. Fix notifications table RLS policies
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Create new notifications policies
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT USING (
  -- All authenticated users can read active notifications
  is_active = true
  OR
  -- Admins can see all notifications (including inactive ones)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT WITH CHECK (
  -- Only admins can create notifications
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE USING (
  -- Only admins can update notifications
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "notifications_delete_policy" ON notifications
FOR DELETE USING (
  -- Only admins can delete notifications
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- ============================================================================
-- 7. Ensure RLS is enabled on all tables
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. Schedule and System Config policies (everyone can read, only admins can modify)
-- ============================================================================

-- Schedule policies
CREATE POLICY "schedule_select_policy" ON schedule
FOR SELECT USING (true); -- All authenticated users can read schedule

CREATE POLICY "schedule_insert_policy" ON schedule
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "schedule_update_policy" ON schedule
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "schedule_delete_policy" ON schedule
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- System config policies
CREATE POLICY "system_config_select_policy" ON system_config
FOR SELECT USING (
  -- All authenticated users can read system config
  true
);

CREATE POLICY "system_config_insert_policy" ON system_config
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "system_config_update_policy" ON system_config
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "system_config_delete_policy" ON system_config
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- ============================================================================
-- 9. Create helper function to check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY definer
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = user_uuid 
    AND is_admin = true
  );
$$;

-- ============================================================================
-- 10. Grant necessary permissions
-- ============================================================================

-- Grant usage on auth schema to authenticated users
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================

-- This script should resolve:
-- 1. Admin users not seeing all users in AdminUsers component
-- 2. 403 errors when loading team invites
-- 3. Proper access control for all tables while maintaining security
--
-- To apply this script:
-- 1. Run it in your Supabase SQL editor
-- 2. Ensure you have at least one admin user in the profiles table
-- 3. Test the functionality in your application