-- Fix 0: Drop existing functions that need to be changed
DROP FUNCTION IF EXISTS "public"."get_all_users_for_admin"();

-- Fix 1: Create missing create_team_invite function
CREATE OR REPLACE FUNCTION "public"."create_team_invite"(
    "p_team_id" "uuid", 
    "p_inviter_id" "uuid", 
    "p_invitee_email" "text"
) RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    invitee_user_id UUID;
    existing_invite_count INTEGER;
    team_member_count INTEGER;
BEGIN
    -- Check if the invitee exists in the profiles table
    SELECT user_id INTO invitee_user_id 
    FROM public.profiles 
    WHERE email = p_invitee_email;
    
    IF invitee_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'User with email ' || p_invitee_email || ' does not exist in the system'
        );
    END IF;
    
    -- Check if user is already a team member
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
    
    -- Check team capacity (max 4 members)
    SELECT COUNT(*) INTO team_member_count
    FROM public.team_members 
    WHERE team_id = p_team_id;
    
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

-- Fix 2: Recreate get_all_users_for_admin function with enhanced data
CREATE FUNCTION "public"."get_all_users_for_admin"() 
RETURNS TABLE(
    "id" "uuid", 
    "email" "text", 
    "created_at" "text", 
    "last_sign_in_at" "text", 
    "is_admin" boolean, 
    "full_name" "text"
)
LANGUAGE "sql" SECURITY DEFINER
AS $$
  SELECT 
    p.user_id as id,
    p.email,
    p.created_at::TEXT as created_at,
    NULL::TEXT as last_sign_in_at,     -- We can't access auth.users from here due to RLS
    COALESCE(p.is_admin, false) as is_admin,
    p.full_name
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.is_admin = true
  )
  ORDER BY p.created_at DESC;
$$;

-- Fix 3: Create a function to get team invite status for debugging
CREATE OR REPLACE FUNCTION "public"."get_team_invites_for_admin"() 
RETURNS TABLE(
    "id" "uuid",
    "team_name" "text",
    "inviter_email" "text",
    "invitee_email" "text",
    "status" "text",
    "created_at" timestamp with time zone
)
LANGUAGE "sql" SECURITY DEFINER
AS $$
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
  WHERE EXISTS (
    SELECT 1 FROM profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.is_admin = true
  )
  ORDER BY ti.created_at DESC;
$$;

-- Fix 4: Improve team member management with proper status tracking
CREATE OR REPLACE FUNCTION "public"."get_team_details_for_admin"() 
RETURNS TABLE(
    "team_id" "uuid",
    "team_name" "text",
    "leader_email" "text",
    "room" "text",
    "is_finalized" boolean,
    "member_count" integer,
    "pending_invites" integer
)
LANGUAGE "sql" SECURITY DEFINER
AS $$
  SELECT 
    t.id as team_id,
    t.name as team_name,
    p.email as leader_email,
    t.room,
    t.is_finalized,
    (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id AND tm.status = 'accepted') as member_count,
    (SELECT COUNT(*) FROM team_invites ti WHERE ti.team_id = t.id AND ti.status = 'pending') as pending_invites
  FROM teams t
  JOIN profiles p ON t.leader_id = p.user_id
  WHERE EXISTS (
    SELECT 1 FROM profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.is_admin = true
  )
  ORDER BY t.created_at DESC;
$$;

-- Fix 5: Function to clean up expired invites
CREATE OR REPLACE FUNCTION "public"."cleanup_expired_invites"() 
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.team_invites 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$;

-- Fix 6: Enhanced team member validation
CREATE OR REPLACE FUNCTION "public"."validate_team_invite_acceptance"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
DECLARE
    team_member_count INTEGER;
BEGIN
    -- Only check on INSERT of new accepted members
    IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
        -- Check current team member count
        SELECT COUNT(*) INTO team_member_count
        FROM team_members 
        WHERE team_id = NEW.team_id AND status = 'accepted';
        
        -- Prevent exceeding team capacity
        IF team_member_count > 4 THEN
            RAISE EXCEPTION 'Team cannot have more than 4 members';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for team member validation
DROP TRIGGER IF EXISTS "validate_team_member_capacity" ON "public"."team_members";
CREATE TRIGGER "validate_team_member_capacity" 
    BEFORE INSERT OR UPDATE ON "public"."team_members" 
    FOR EACH ROW EXECUTE FUNCTION "public"."validate_team_invite_acceptance"();

-- Fix 7: Function to get pending team invites for a user
CREATE OR REPLACE FUNCTION "public"."get_user_pending_invites"("user_email" "text") 
RETURNS TABLE(
    "invite_id" "uuid",
    "team_id" "uuid",
    "team_name" "text",
    "inviter_name" "text",
    "inviter_email" "text",
    "created_at" timestamp with time zone
)
LANGUAGE "sql" SECURITY DEFINER
AS $$
  SELECT 
    ti.id as invite_id,
    ti.team_id,
    t.name as team_name,
    p.full_name as inviter_name,
    p.email as inviter_email,
    ti.created_at
  FROM team_invites ti
  JOIN teams t ON ti.team_id = t.id
  JOIN profiles p ON ti.inviter_id = p.user_id
  WHERE ti.invitee_email = user_email 
  AND ti.status = 'pending'
  AND ti.expires_at > NOW()
  ORDER BY ti.created_at DESC;
$$;

-- Fix 8: Add a function to respond to team invites (combined accept/decline)
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
        -- Check team capacity (max 4 members)
        SELECT COUNT(*) INTO team_member_count
        FROM public.team_members 
        WHERE team_id = invite_record.team_id AND status = 'accepted';
        
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

-- Grant necessary permissions for all new functions
GRANT ALL ON FUNCTION "public"."create_team_invite"("p_team_id" "uuid", "p_inviter_id" "uuid", "p_invitee_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_team_invite"("p_team_id" "uuid", "p_inviter_id" "uuid", "p_invitee_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team_invite"("p_team_id" "uuid", "p_inviter_id" "uuid", "p_invitee_email" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_all_users_for_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users_for_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users_for_admin"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_team_invites_for_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_invites_for_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_invites_for_admin"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_team_details_for_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_details_for_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_details_for_admin"() TO "service_role";

GRANT ALL ON FUNCTION "public"."cleanup_expired_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invites"() TO "service_role";

GRANT ALL ON FUNCTION "public"."validate_team_invite_acceptance"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_team_invite_acceptance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_team_invite_acceptance"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("user_email" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."respond_to_team_invite"("invite_id" "uuid", "response" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."respond_to_team_invite"("invite_id" "uuid", "response" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_team_invite"("invite_id" "uuid", "response" "text") TO "service_role";

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS "idx_team_invites_status_expires" ON "public"."team_invites" USING "btree" ("status", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");

-- Clean up any orphaned data
DELETE FROM team_invites WHERE team_id NOT IN (SELECT id FROM teams);
DELETE FROM team_members WHERE team_id NOT IN (SELECT id FROM teams);

-- Add missed responded_at column to team_invites if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_invites' AND column_name = 'responded_at') THEN
        ALTER TABLE public.team_invites ADD COLUMN responded_at timestamp with time zone;
    END IF;
END $$;