-- ==========================================
-- FIXED USER SETUP SCRIPT
-- ==========================================
-- This works with your existing database schema

-- Step 1: Set aidenpinto14@gmail.com as admin (if exists, otherwise create)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM profiles WHERE email = 'aidenpinto14@gmail.com') THEN
        UPDATE profiles SET is_admin = true WHERE email = 'aidenpinto14@gmail.com';
    ELSE
        INSERT INTO profiles (user_id, email, full_name, is_admin) 
        VALUES (gen_random_uuid(), 'aidenpinto14@gmail.com', 'Aiden Pinto', true);
    END IF;
END $$;

-- Step 2: Create registration for aidenpinto14@gmail.com (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM registrations WHERE email = 'aidenpinto14@gmail.com') THEN
        INSERT INTO registrations (user_id, email, full_name, checked_in) 
        VALUES (
            (SELECT user_id FROM profiles WHERE email = 'aidenpinto14@gmail.com'), 
            'aidenpinto14@gmail.com', 
            'Aiden Pinto', 
            true
        );
    ELSE
        UPDATE registrations SET checked_in = true WHERE email = 'aidenpinto14@gmail.com';
    END IF;
END $$;

-- Step 3: Create textnowalt1234@gmail.com (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'textnowalt1234@gmail.com') THEN
        INSERT INTO profiles (user_id, email, full_name, is_admin) 
        VALUES (gen_random_uuid(), 'textnowalt1234@gmail.com', 'Text Now Alt User', false);
    END IF;
END $$;

-- Step 4: Create registration for textnowalt1234@gmail.com (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM registrations WHERE email = 'textnowalt1234@gmail.com') THEN
        INSERT INTO registrations (user_id, email, full_name, checked_in) 
        VALUES (
            (SELECT user_id FROM profiles WHERE email = 'textnowalt1234@gmail.com'), 
            'textnowalt1234@gmail.com', 
            'Text Now Alt User', 
            true
        );
    ELSE
        UPDATE registrations SET checked_in = true WHERE email = 'textnowalt1234@gmail.com';
    END IF;
END $$;

-- Step 5: Create weirdalt1234@gmail.com (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'weirdalt1234@gmail.com') THEN
        INSERT INTO profiles (user_id, email, full_name, is_admin) 
        VALUES (gen_random_uuid(), 'weirdalt1234@gmail.com', 'Weird Alt User', false);
    END IF;
END $$;

-- Step 6: Create registration for weirdalt1234@gmail.com (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM registrations WHERE email = 'weirdalt1234@gmail.com') THEN
        INSERT INTO registrations (user_id, email, full_name, checked_in) 
        VALUES (
            (SELECT user_id FROM profiles WHERE email = 'weirdalt1234@gmail.com'), 
            'weirdalt1234@gmail.com', 
            'Weird Alt User', 
            true
        );
    ELSE
        UPDATE registrations SET checked_in = true WHERE email = 'weirdalt1234@gmail.com';
    END IF;
END $$;

-- Step 7: Verify all users are set up correctly
SELECT 
    'User setup verification' as info,
    p.email,
    p.full_name,
    p.is_admin,
    r.checked_in,
    CASE 
        WHEN r.checked_in = true AND p.is_admin = true THEN 'Admin ready'
        WHEN r.checked_in = true THEN 'Ready for team invites'
        WHEN r.user_id IS NULL THEN 'No registration'
        ELSE 'Not checked in'
    END as status
FROM profiles p
LEFT JOIN registrations r ON p.user_id = r.user_id
WHERE p.email IN ('aidenpinto14@gmail.com', 'textnowalt1234@gmail.com', 'weirdalt1234@gmail.com')
ORDER BY p.email;

-- Step 8: Test that invite requirements are met
SELECT 
    'Invite readiness test' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'aidenpinto14@gmail.com' AND is_admin = true)
         AND EXISTS (SELECT 1 FROM profiles WHERE email = 'weirdalt1234@gmail.com')
         AND EXISTS (SELECT 1 FROM registrations WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'weirdalt1234@gmail.com') AND checked_in = true)
         AND EXISTS (SELECT 1 FROM registrations WHERE user_id = (SELECT user_id FROM profiles WHERE email = 'textnowalt1234@gmail.com') AND checked_in = true)
        THEN 'All requirements met - everything should work!'
        ELSE 'Something is still missing'
    END as result;