-- ==========================================
-- COMPLETE USER SETUP SCRIPT
-- ==========================================
-- This creates both users and sets up the invitation scenario

-- Step 1: Set aidenpinto14@gmail.com as admin
INSERT INTO profiles (user_id, email, full_name, is_admin) 
VALUES (gen_random_uuid(), 'aidenpinto14@gmail.com', 'Aiden Pinto', true)
ON CONFLICT (email) DO UPDATE SET 
    is_admin = true,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Step 1b: Create textnowalt1234@gmail.com (the inviter) as regular user
INSERT INTO profiles (user_id, email, full_name, is_admin) 
VALUES (gen_random_uuid(), 'textnowalt1234@gmail.com', 'Text Now Alt User', false)
ON CONFLICT (email) DO UPDATE SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Step 2: Create registration for aidenpinto14@gmail.com (admin)
INSERT INTO registrations (user_id, email, full_name, checked_in) 
VALUES (
    (SELECT user_id FROM profiles WHERE email = 'aidenpinto14@gmail.com'), 
    'aidenpinto14@gmail.com', 
    'Aiden Pinto', 
    true
) ON CONFLICT (user_id) DO UPDATE SET 
    checked_in = true,
    full_name = COALESCE(EXCLUDED.full_name, registrations.full_name);

-- Step 2b: Create registration for textnowalt1234@gmail.com
INSERT INTO registrations (user_id, email, full_name, checked_in) 
VALUES (
    (SELECT user_id FROM profiles WHERE email = 'textnowalt1234@gmail.com'), 
    'textnowalt1234@gmail.com', 
    'Text Now Alt User', 
    true
) ON CONFLICT (user_id) DO UPDATE SET 
    checked_in = true,
    full_name = COALESCE(EXCLUDED.full_name, registrations.full_name);

-- Step 3: Create weirdalt1234@gmail.com (the invitee)
INSERT INTO profiles (user_id, email, full_name) 
VALUES (gen_random_uuid(), 'weirdalt1234@gmail.com', 'Weird Alt User')
ON CONFLICT (email) DO UPDATE SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Step 4: Create registration for weirdalt1234@gmail.com with check-in
INSERT INTO registrations (user_id, email, full_name, checked_in) 
VALUES (
    (SELECT user_id FROM profiles WHERE email = 'weirdalt1234@gmail.com'), 
    'weirdalt1234@gmail.com', 
    'Weird Alt User', 
    true
) ON CONFLICT (user_id) DO UPDATE SET 
    checked_in = true,
    full_name = COALESCE(EXCLUDED.full_name, registrations.full_name);

-- Step 5: Verify both users are set up correctly
SELECT 
    'User setup verification' as info,
    p.email,
    p.full_name,
    p.is_admin,
    r.checked_in,
    CASE 
        WHEN r.checked_in = true AND p.is_admin = true THEN 'Admin ready to invite'
        WHEN r.checked_in = true THEN 'Ready for team invites'
        WHEN r.user_id IS NULL THEN 'No registration'
        ELSE 'Not checked in'
    END as status
FROM profiles p
LEFT JOIN registrations r ON p.user_id = r.user_id
WHERE p.email IN ('aidenpinto14@gmail.com', 'textnowalt1234@gmail.com', 'weirdalt1234@gmail.com')
ORDER BY p.email;

-- Step 6: Test the create_team_invite function to make sure it works
-- (This is just a verification query, not actually creating an invite)
SELECT 
    'Function test' as info,
    'textnowalt1234@gmail.com can invite weirdalt1234@gmail.com' as message,
    CASE 
        WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'aidenpinto14@gmail.com' AND is_admin = true)
         AND EXISTS (SELECT 1 FROM profiles WHERE email = 'weirdalt1234@gmail.com')
         AND EXISTS (SELECT 1 FROM registrations WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'weirdalt1234@gmail.com') AND checked_in = true)
        THEN 'All requirements met - invites should work!'
        ELSE 'Something is still missing'
    END as result;