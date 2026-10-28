-- COMPREHENSIVE APPLICATION FIX
-- This addresses all the application-level issues identified

-- ============================================================================
-- 1. Create a function to safely get all users for admin (replaces auth.admin calls)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE(
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  is_admin BOOLEAN,
  full_name TEXT
)
LANGUAGE sql
SECURITY definer
AS $$
  SELECT 
    p.user_id as id,
    p.email,
    p.created_at,
    NULL as last_sign_in_at,  -- We can't get this from profiles
    p.is_admin,
    p.full_name
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.is_admin = true
  )
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;

-- ============================================================================
-- 2. Create a simpler team invite function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_team_invite(
  p_team_id UUID,
  p_inviter_id UUID,
  p_invitee_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_is_registered BOOLEAN;
  v_is_checked_in BOOLEAN;
  v_invite_id UUID;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE email = p_invitee_email) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RETURN json_build_object('success', false, 'error', 'User not found. Make sure they have created an account.');
  END IF;
  
  -- Check if user is registered
  SELECT EXISTS(
    SELECT 1 FROM registrations r 
    JOIN profiles p ON r.user_id = p.user_id 
    WHERE p.email = p_invitee_email
  ) INTO v_is_registered;
  
  IF NOT v_is_registered THEN
    RETURN json_build_object('success', false, 'error', 'User is not registered for the event.');
  END IF;
  
  -- Check if user is checked in
  SELECT COALESCE(r.checked_in, false) INTO v_is_checked_in
  FROM registrations r 
  JOIN profiles p ON r.user_id = p.user_id 
  WHERE p.email = p_invitee_email;
  
  IF NOT v_is_checked_in THEN
    RETURN json_build_object('success', false, 'error', 'User must be checked in to receive team invites.');
  END IF;
  
  -- Create the invite
  INSERT INTO team_invites (team_id, inviter_id, invitee_email, status)
  VALUES (p_team_id, p_inviter_id, p_invitee_email, 'pending')
  RETURNING id INTO v_invite_id;
  
  RETURN json_build_object('success', true, 'invite_id', v_invite_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_team_invite(UUID, UUID, TEXT) TO authenticated;

-- ============================================================================
-- 3. Create a function to get user registration status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_registration_status(user_uuid UUID)
RETURNS JSON
LANGUAGE sql
SECURITY definer
AS $$
  SELECT json_build_object(
    'user_id', r.user_id,
    'email', r.email,
    'full_name', r.full_name,
    'checked_in', COALESCE(r.checked_in, false),
    'registered_at', r.registered_at
  )
  FROM registrations r
  WHERE r.user_id = user_uuid;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_registration_status(UUID) TO authenticated;

-- ============================================================================
-- 4. Ensure all necessary data exists for testing
-- ============================================================================

-- Make sure we have at least one admin user (you might need to adjust the email)
-- UPDATE profiles SET is_admin = true WHERE email = 'admin@hacktheridge.com';

-- ============================================================================
-- 5. Create indexes for better performance
-- ============================================================================

-- Index on profiles for faster admin checks
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Index on registrations for faster check-in lookups
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON registrations(checked_in) WHERE checked_in = true;

-- Index on team_invites for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status);

-- ============================================================================
-- 6. Test queries
-- ============================================================================

SELECT 'Database functions created successfully!' as status;

-- Test admin user function
SELECT 'Testing admin user function:' as test;
SELECT * FROM get_all_users_for_admin() LIMIT 3;

-- Show current admin users
SELECT 'Current admin users:' as info;
SELECT user_id, email, full_name, is_admin FROM profiles WHERE is_admin = true;