-- ==========================================
-- DIAGNOSTIC AND SETUP SCRIPT
-- ==========================================
-- Run this AFTER the FINAL_WORKING_FIX.sql

-- Step 1: Check current user admin status
SELECT 
    'Current user admin check' as check_type,
    auth.uid() as current_user_id,
    (SELECT email FROM profiles WHERE user_id = auth.uid()) as current_email,
    (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) as is_admin;

-- Step 2: List all users to see who exists
SELECT 'All users in system' as info, email, full_name, is_admin 
FROM profiles 
ORDER BY email;

-- Step 3: Set your current user as admin (replace with your actual email)
UPDATE profiles 
SET is_admin = true 
WHERE email = 'aidenpinto14@gmail.com';

-- Step 4: Create the test user that you're trying to invite
INSERT INTO profiles (user_id, email, full_name) 
VALUES (gen_random_uuid(), 'weirdalt1234@gmail.com', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- Step 5: Create a registration for the test user with check-in
INSERT INTO registrations (user_id, email, full_name, checked_in) 
VALUES (
    (SELECT user_id FROM profiles WHERE email = 'weirdalt1234@gmail.com'), 
    'weirdalt1234@gmail.com', 
    'Test User', 
    true
) ON CONFLICT (user_id) DO UPDATE SET checked_in = true;

-- Step 6: Verify the setup worked
SELECT 
    'Setup verification' as info,
    p.email,
    p.full_name,
    p.is_admin,
    r.checked_in,
    CASE 
        WHEN r.checked_in = true THEN 'Ready for team invites'
        WHEN r.user_id IS NULL THEN 'No registration'
        ELSE 'Not checked in'
    END as status
FROM profiles p
LEFT JOIN registrations r ON p.user_id = r.user_id
WHERE p.email IN ('aidenpinto14@gmail.com', 'textnowalt1234@gmail.com', 'weirdalt1234@gmail.com')
ORDER BY p.email;