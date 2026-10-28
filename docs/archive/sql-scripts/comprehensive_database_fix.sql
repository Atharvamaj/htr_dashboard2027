-- ==========================================
-- COMPREHENSIVE DATABASE FIX
-- ==========================================
-- This script fixes all the major issues:
-- 1. Admin user visibility (406 errors)
-- 2. Team invitation functionality
-- 3. RLS policy issues
-- 4. Missing functions

-- Step 1: Drop existing problematic functions
DROP FUNCTION IF EXISTS "public"."get_all_users_for_admin"();
DROP FUNCTION IF EXISTS "public"."create_team_invite"(uuid, uuid, text);

-- Step 2: Fix RLS policies for admin access
-- Update profiles RLS policy to allow proper admin access
DROP POLICY IF EXISTS "profiles_access" ON "public"."profiles";
CREATE POLICY "profiles_access" ON "public"."profiles" 
FOR ALL 
USING (
    (auth.uid() = user_id) OR 
    EXISTS (
        SELECT 1 FROM public.profiles admin_profiles 
        WHERE admin_profiles.user_id = auth.uid() 
        AND admin_profiles.is_admin = true
    )
);

-- Step 3: Create a proper admin users function that bypasses RLS issues
CREATE OR REPLACE FUNCTION "public"."get_all_users_for_admin"()
RETURNS TABLE(
    "id" "uuid", 
    "email" "text", 
    "created_at" "text", 
    "last_sign_in_at" "text", 
    "is_admin" boolean, 
    "full_name" "text"
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Return all users with admin privileges
    RETURN QUERY
    SELECT 
        p.user_id as id,
        p.email,
        p.created_at::TEXT as created_at,
        NULL::TEXT as last_sign_in_at,
        COALESCE(p.is_admin, false) as is_admin,
        p.full_name
    FROM profiles p
    ORDER BY p.created_at DESC;
END;
$$;

-- Step 4: Create the missing team invite function
CREATE OR REPLACE FUNCTION "public"."create_team_invite"(
    "p_team_id" "uuid", 
    "p_inviter_id" "uuid", 
    "p_invitee_email" "text"
) RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    invitee_user_id UUID;
    invitee_profile RECORD;
    invitee_registration RECORD;
    existing_invite_count INTEGER;
    team_member_count INTEGER;
    team_info RECORD;
BEGIN
    -- Get team info
    SELECT * INTO team_info FROM public.teams WHERE id = p_team_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Team not found'
        );
    END IF;
    
    -- Check if the invitee exists in the profiles table
    SELECT user_id, email, full_name INTO invitee_profile
    FROM public.profiles 
    WHERE email = p_invitee_email;
    
    IF invitee_profile.user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User with email ' || p_invitee_email || ' does not exist in the system. They need to create an account first.'
        );
    END IF;
    
    invitee_user_id := invitee_profile.user_id;
    
    -- Check if user has a registration
    SELECT * INTO invitee_registration
    FROM public.registrations 
    WHERE user_id = invitee_user_id;
    
    IF invitee_registration.user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User ' || p_invitee_email || ' has an account but is not registered for the hackathon. They need to complete registration first.'
        );
    END IF;
    
    -- Check if user is checked in
    IF invitee_registration.checked_in IS NOT TRUE THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User ' || p_invitee_email || ' is registered but has not been checked in to the event yet. Please check them in before inviting to a team.'
        );
    END IF;
    
    -- Check if user is already a team member of ANY team
    IF EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE user_id = invitee_user_id AND status = 'accepted'
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User is already a member of another team'
        );
    END IF;
    
    -- Check if user is already a team member of THIS team
    IF EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = p_team_id AND user_id = invitee_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User is already a member of this team'
        );
    END IF;
    
    -- Check if there's already a pending invite for this user to this team
    SELECT COUNT(*) INTO existing_invite_count
    FROM public.team_invites 
    WHERE team_id = p_team_id 
    AND invitee_email = p_invitee_email 
    AND status = 'pending';
    
    IF existing_invite_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'An invite has already been sent to this email'
        );
    END IF;
    
    -- Check team capacity (max 4 members including leader)
    SELECT COUNT(*) INTO team_member_count
    FROM public.team_members 
    WHERE team_id = p_team_id AND status = 'accepted';
    
    -- Add 1 for the team leader if they're not in team_members
    IF NOT EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = p_team_id AND user_id = team_info.leader_id AND status = 'accepted'
    ) THEN
        team_member_count := team_member_count + 1;
    END IF;
    
    IF team_member_count >= 4 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Team is already at maximum capacity (4 members)'
        );
    END IF;
    
    -- Create the invite
    INSERT INTO public.team_invites (team_id, inviter_id, invitee_email)
    VALUES (p_team_id, p_inviter_id, p_invitee_email);
    
    RETURN jsonb_build_object('success', true, 'message', 'Invite sent successfully');
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;

-- Step 5: Create a function to get user profiles for admin (to fix the 406 errors)
CREATE OR REPLACE FUNCTION "public"."get_user_profile_for_admin"("user_email" "text")
RETURNS TABLE(
    "user_id" "uuid",
    "email" "text",
    "full_name" "text",
    "is_admin" boolean,
    "has_registration" boolean,
    "is_checked_in" boolean
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Return user profile information
    RETURN QUERY
    SELECT 
        p.user_id,
        p.email,
        p.full_name,
        COALESCE(p.is_admin, false) as is_admin,
        EXISTS(SELECT 1 FROM registrations r WHERE r.user_id = p.user_id) as has_registration,
        EXISTS(SELECT 1 FROM registrations r WHERE r.user_id = p.user_id AND r.checked_in = true) as is_checked_in
    FROM profiles p
    WHERE p.email = user_email;
END;
$$;

-- Step 6: Create improved invite acceptance functions
CREATE OR REPLACE FUNCTION "public"."respond_to_team_invite"(
    "invite_id" "uuid", 
    "response" "text"
) RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    invite_record RECORD;
    user_email TEXT;
    team_member_count INTEGER;
    team_info RECORD;
BEGIN
    -- Validate response
    IF response NOT IN ('accept', 'decline') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Invalid response. Must be "accept" or "decline"'
        );
    END IF;
    
    -- Get invite details
    SELECT * INTO invite_record FROM public.team_invites WHERE id = invite_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Invite not found'
        );
    END IF;
    
    -- Get current user's email
    SELECT email INTO user_email FROM public.profiles WHERE user_id = auth.uid();
    
    -- Check if invite is for current user
    IF invite_record.invitee_email != user_email THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'This invite is not for you'
        );
    END IF;
    
    -- Check if invite is still pending
    IF invite_record.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'This invite has already been responded to'
        );
    END IF;
    
    -- Check if invite has expired
    IF invite_record.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'This invite has expired'
        );
    END IF;
    
    IF response = 'accept' THEN
        -- Get team info
        SELECT * INTO team_info FROM public.teams WHERE id = invite_record.team_id;
        
        -- Check if user is already in a team
        IF EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE user_id = auth.uid() AND status = 'accepted'
        ) THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'You are already a member of another team'
            );
        END IF;
        
        -- Check team capacity (max 4 members including leader)
        SELECT COUNT(*) INTO team_member_count
        FROM public.team_members 
        WHERE team_id = invite_record.team_id AND status = 'accepted';
        
        -- Add 1 for the team leader if they're not in team_members
        IF NOT EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_id = invite_record.team_id AND user_id = team_info.leader_id AND status = 'accepted'
        ) THEN
            team_member_count := team_member_count + 1;
        END IF;
        
        IF team_member_count >= 4 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Team is already at maximum capacity'
            );
        END IF;
        
        -- Update invite status
        UPDATE public.team_invites 
        SET status = 'accepted', responded_at = now() 
        WHERE id = invite_id;
        
        -- Add user to team
        INSERT INTO public.team_members (team_id, user_id, status)
        VALUES (invite_record.team_id, auth.uid(), 'accepted');
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Invite accepted successfully'
        );
    ELSE
        -- Decline invite
        UPDATE public.team_invites 
        SET status = 'declined', responded_at = now() 
        WHERE id = invite_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Invite declined successfully'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;

-- Step 7: Create function for team invite debugging
CREATE OR REPLACE FUNCTION "public"."get_team_invites_for_admin"() 
RETURNS TABLE(
    "id" "uuid",
    "team_name" "text",
    "inviter_email" "text",
    "invitee_email" "text",
    "status" "text",
    "created_at" timestamp with time zone
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        ti.id,
        t.name as team_name,
        p.email as inviter_email,
        ti.invitee_email,
        ti.status,
        ti.created_at
    FROM team_invites ti
    JOIN teams t ON ti.team_id = t.id
    JOIN profiles p ON ti.inviter_id = p.user_id
    ORDER BY ti.created_at DESC;
END;
$$;

-- Step 8: Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_invites' AND column_name = 'responded_at') THEN
        ALTER TABLE public.team_invites ADD COLUMN responded_at timestamp with time zone;
    END IF;
END $$;

-- Step 9: Grant permissions for all functions
GRANT ALL ON FUNCTION "public"."get_all_users_for_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users_for_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users_for_admin"() TO "service_role";

GRANT ALL ON FUNCTION "public"."create_team_invite"("p_team_id" "uuid", "p_inviter_id" "uuid", "p_invitee_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_team_invite"("p_team_id" "uuid", "p_inviter_id" "uuid", "p_invitee_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team_invite"("p_team_id" "uuid", "p_inviter_id" "uuid", "p_invitee_email" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_user_profile_for_admin"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile_for_admin"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile_for_admin"("user_email" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."respond_to_team_invite"("invite_id" "uuid", "response" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."respond_to_team_invite"("invite_id" "uuid", "response" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_team_invite"("invite_id" "uuid", "response" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_team_invites_for_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_invites_for_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_invites_for_admin"() TO "service_role";

-- Step 10: Add performance indexes
CREATE INDEX IF NOT EXISTS "idx_team_invites_status_expires" ON "public"."team_invites" USING "btree" ("status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");
CREATE INDEX IF NOT EXISTS "idx_profiles_admin" ON "public"."profiles" USING "btree" ("is_admin");
CREATE INDEX IF NOT EXISTS "idx_team_members_status" ON "public"."team_members" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_registrations_checked_in" ON "public"."registrations" USING "btree" ("checked_in");

-- Step 11: Clean up any orphaned data
DELETE FROM team_invites WHERE team_id NOT IN (SELECT id FROM teams);
DELETE FROM team_members WHERE team_id NOT IN (SELECT id FROM teams);

-- Step 12: Update the existing accept/decline functions to be consistent
DROP FUNCTION IF EXISTS "public"."accept_team_invite"("invite_id" "uuid");
DROP FUNCTION IF EXISTS "public"."decline_team_invite"("invite_id" "uuid");

-- Use the unified respond_to_team_invite function instead
-- These wrapper functions maintain backward compatibility
CREATE OR REPLACE FUNCTION "public"."accept_team_invite"("invite_id" "uuid") RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT public.respond_to_team_invite(invite_id, 'accept') INTO result;
    
    IF NOT (result->>'success')::BOOLEAN THEN
        RAISE EXCEPTION '%', result->>'error';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."decline_team_invite"("invite_id" "uuid") RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT public.respond_to_team_invite(invite_id, 'decline') INTO result;
    
    IF NOT (result->>'success')::BOOLEAN THEN
        RAISE EXCEPTION '%', result->>'error';
    END IF;
END;
$$;

GRANT ALL ON FUNCTION "public"."accept_team_invite"("invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_team_invite"("invite_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."decline_team_invite"("invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decline_team_invite"("invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_team_invite"("invite_id" "uuid") TO "service_role";

-- Step 13: Ensure registrations RLS policy allows admin access
DROP POLICY IF EXISTS "registrations_access" ON "public"."registrations";
CREATE POLICY "registrations_access" ON "public"."registrations" 
FOR ALL 
USING (
    (auth.uid() = user_id) OR 
    EXISTS (
        SELECT 1 FROM public.profiles admin_profiles 
        WHERE admin_profiles.user_id = auth.uid() 
        AND admin_profiles.is_admin = true
    )
);

-- FINAL MESSAGE
-- This comprehensive fix should resolve:
-- ✅ Admin users can now see users (get_all_users_for_admin function fixed)
-- ✅ Team invitations now work properly (create_team_invite function added)
-- ✅ Better error messages for invite failures
-- ✅ RLS policies updated to allow proper admin access
-- ✅ Performance indexes added
-- ✅ Data cleanup performed