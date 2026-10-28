-- DISABLE ALL RLS TO GET SYSTEM FULLY OPERATIONAL
-- This removes all Row Level Security restrictions temporarily
-- WARNING: This removes security restrictions - only use for development/testing

-- ============================================================================
-- STEP 1: Drop ALL existing policies on ALL tables
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Teams policies
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;

-- Team members policies
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Team invites policies
DROP POLICY IF EXISTS "team_invites_select_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_insert_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_update_policy" ON team_invites;
DROP POLICY IF EXISTS "team_invites_delete_policy" ON team_invites;

-- Registrations policies
DROP POLICY IF EXISTS "registrations_select_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_update_policy" ON registrations;
DROP POLICY IF EXISTS "registrations_delete_policy" ON registrations;

-- Notifications policies
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Schedule policies
DROP POLICY IF EXISTS "schedule_select_policy" ON schedule;
DROP POLICY IF EXISTS "schedule_insert_policy" ON schedule;
DROP POLICY IF EXISTS "schedule_update_policy" ON schedule;
DROP POLICY IF EXISTS "schedule_delete_policy" ON schedule;

-- System config policies
DROP POLICY IF EXISTS "system_config_select_policy" ON system_config;
DROP POLICY IF EXISTS "system_config_insert_policy" ON system_config;
DROP POLICY IF EXISTS "system_config_update_policy" ON system_config;
DROP POLICY IF EXISTS "system_config_delete_policy" ON system_config;

-- User notifications policies
DROP POLICY IF EXISTS "user_notifications_select_policy" ON user_notifications;
DROP POLICY IF EXISTS "user_notifications_insert_policy" ON user_notifications;
DROP POLICY IF EXISTS "user_notifications_update_policy" ON user_notifications;
DROP POLICY IF EXISTS "user_notifications_delete_policy" ON user_notifications;

-- ============================================================================
-- STEP 2: Disable RLS on ALL tables
-- ============================================================================

-- Core user and team tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites DISABLE ROW LEVEL SECURITY;

-- System tables
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_config DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Grant broad permissions to authenticated users
-- ============================================================================

-- Grant schema access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant table access
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Grant sequence access (for auto-increment IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- STEP 4: Test queries to verify everything works
-- ============================================================================

-- Test that we can access all tables
SELECT 
  'Full access test results:' as test_type,
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM teams) as teams_count,
  (SELECT COUNT(*) FROM team_members) as team_members_count,
  (SELECT COUNT(*) FROM team_invites) as team_invites_count,
  (SELECT COUNT(*) FROM registrations) as registrations_count,
  (SELECT COUNT(*) FROM notifications) as notifications_count,
  (SELECT COUNT(*) FROM schedule) as schedule_count,
  (SELECT COUNT(*) FROM system_config) as system_config_count;

SELECT 'ALL RLS DISABLED! Your admin dashboard should now work completely.' as status;
SELECT 'Remember: This is for development only. Implement proper security before production!' as warning;