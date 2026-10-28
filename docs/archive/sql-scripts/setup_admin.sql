-- ADMIN SETUP SCRIPT
-- Run this to set up admin users and test the functionality

-- ============================================================================
-- 1. First, run the comprehensive application fixes
-- ============================================================================

\i app_fixes.sql

-- ============================================================================
-- 2. Make your user an admin (REPLACE WITH YOUR ACTUAL EMAIL)
-- ============================================================================

-- Replace 'your-email@domain.com' with your actual email address
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@domain.com';

-- For now, let's make the first user in the system an admin for testing
UPDATE profiles 
SET is_admin = true 
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- ============================================================================
-- 3. Show current state
-- ============================================================================

SELECT 'Current profiles:' as info;
SELECT id, email, full_name, is_admin, created_at FROM profiles ORDER BY created_at;

SELECT 'Current registrations:' as info;
SELECT id, email, full_name, checked_in FROM registrations ORDER BY registered_at;

SELECT 'Current teams:' as info;
SELECT id, name, leader_id, room, is_finalized FROM teams;

-- ============================================================================
-- 4. Test the admin function
-- ============================================================================

SELECT 'Testing admin functions...' as test;

-- This should work now
SELECT * FROM get_all_users_for_admin();

SELECT 'Setup complete!' as status;