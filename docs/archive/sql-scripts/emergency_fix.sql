-- EMERGENCY FIX: Temporarily disable RLS to get the system working
-- USE THIS ONLY if the comprehensive fix doesn't work
-- This is not secure but will get you operational while we figure out the proper policies

-- WARNING: This removes security restrictions temporarily

-- Drop all problematic policies
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

DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;

-- Temporarily disable RLS on problematic tables
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;

-- Keep profiles secure (it's working)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; -- Keep this as is

SELECT 'EMERGENCY FIX APPLIED: RLS temporarily disabled on teams/registrations tables!' as status;
SELECT 'WARNING: This removes security restrictions. Apply proper policies ASAP!' as warning;