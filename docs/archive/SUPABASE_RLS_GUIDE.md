# Supabase Row Level Security (RLS) Policy Guide

**Critical Security Component**  
**Status:** ⚠️ MUST BE VERIFIED AND IMPLEMENTED

---

## Overview

Row Level Security (RLS) is **THE MOST CRITICAL** security feature in Supabase. It ensures that users can only access data they're authorized to see, even if they bypass client-side security.

**⚠️ WITHOUT PROPER RLS POLICIES, YOUR DATABASE IS COMPLETELY EXPOSED! ⚠️**

---

## Quick Verification Checklist

Run these checks in your Supabase SQL Editor:

### 1. Check if RLS is Enabled on All Tables

```sql
-- List all tables and their RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**✅ Expected Result:** `rls_enabled` should be `true` for ALL tables

### 2. Check Existing Policies

```sql
-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**✅ Expected Result:** Each table should have policies for SELECT, INSERT, UPDATE, DELETE

---

## HTR Dashboard RLS Policies

Below are the recommended RLS policies for your HTR Dashboard tables.

### Table: `registrations`

This table stores user registration data.

#### Enable RLS

```sql
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: Users can view their own registration
CREATE POLICY "users_view_own_registration"
ON registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own registration
CREATE POLICY "users_insert_own_registration"
ON registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own registration (before check-in)
CREATE POLICY "users_update_own_registration"
ON registrations
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND checked_in = false
  AND status = 'pending'
)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users cannot delete registrations (admin only)
-- No DELETE policy = users cannot delete

-- Policy 5: Admins can view all registrations
CREATE POLICY "admins_view_all_registrations"
ON registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 6: Admins can update all registrations
CREATE POLICY "admins_update_all_registrations"
ON registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 7: Admins can delete registrations
CREATE POLICY "admins_delete_registrations"
ON registrations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

---

### Table: `teams`

This table stores team information.

#### Enable RLS

```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: Team members can view their own team
CREATE POLICY "members_view_own_team"
ON teams
FOR SELECT
USING (
  id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Team captain can update team info
CREATE POLICY "captain_update_team"
ON teams
FOR UPDATE
USING (captain_id = auth.uid())
WITH CHECK (captain_id = auth.uid());

-- Policy 3: Users can create teams (become captain)
CREATE POLICY "users_create_team"
ON teams
FOR INSERT
WITH CHECK (captain_id = auth.uid());

-- Policy 4: Only captains can delete their teams
CREATE POLICY "captain_delete_team"
ON teams
FOR DELETE
USING (captain_id = auth.uid());

-- Policy 5: Admins can view all teams
CREATE POLICY "admins_view_all_teams"
ON teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 6: Admins can update/delete any team
CREATE POLICY "admins_manage_teams"
ON teams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

---

### Table: `team_members`

This table links users to teams.

#### Enable RLS

```sql
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: Users can view teams they're part of
CREATE POLICY "users_view_own_team_members"
ON team_members
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Team captain can invite members
CREATE POLICY "captain_invite_members"
ON team_members
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT id FROM teams
    WHERE captain_id = auth.uid()
  )
);

-- Policy 3: Members can leave team
CREATE POLICY "members_leave_team"
ON team_members
FOR DELETE
USING (user_id = auth.uid());

-- Policy 4: Captain can remove members
CREATE POLICY "captain_remove_members"
ON team_members
FOR DELETE
USING (
  team_id IN (
    SELECT id FROM teams
    WHERE captain_id = auth.uid()
  )
);

-- Policy 5: Admins can manage all team members
CREATE POLICY "admins_manage_team_members"
ON team_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

---

### Table: `team_invites`

This table stores pending team invitations.

#### Enable RLS

```sql
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: Users can view invites sent to them
CREATE POLICY "users_view_own_invites"
ON team_invites
FOR SELECT
USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy 2: Team captain can create invites
CREATE POLICY "captain_create_invites"
ON team_invites
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT id FROM teams
    WHERE captain_id = auth.uid()
  )
  AND invited_by = auth.uid()
);

-- Policy 3: Users can respond to their invites (update status)
CREATE POLICY "users_respond_to_invites"
ON team_invites
FOR UPDATE
USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy 4: Captain can delete pending invites
CREATE POLICY "captain_delete_invites"
ON team_invites
FOR DELETE
USING (
  invited_by = auth.uid()
  OR team_id IN (
    SELECT id FROM teams
    WHERE captain_id = auth.uid()
  )
);

-- Policy 5: Admins can manage invites
CREATE POLICY "admins_manage_invites"
ON team_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

---

### Table: `user_roles`

This table stores user role assignments (admin, user, etc.).

**⚠️ CRITICAL: This table must be especially secured!**

#### Enable RLS

```sql
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: Users can view their own role
CREATE POLICY "users_view_own_role"
ON user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Only super admins can modify roles
-- Option A: Using a specific super admin UUID (replace with your admin UUID)
CREATE POLICY "super_admin_manage_roles"
ON user_roles
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles
    WHERE role = 'super_admin'
  )
);

-- Option B: Using email-based check (if you have a specific admin email)
CREATE POLICY "admin_email_manage_roles"
ON user_roles
FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) 
  IN ('admin@hacktheridge.com', 'aiden@hacktheridge.com')
);

-- NO INSERT/UPDATE/DELETE policies for regular users!
-- This prevents privilege escalation attacks
```

---

### Table: `notifications`

This table stores user notifications.

#### Enable RLS

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: Users can view their own notifications
CREATE POLICY "users_view_own_notifications"
ON notifications
FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Users can update their own notifications (mark as read)
CREATE POLICY "users_update_own_notifications"
ON notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 3: System/Admins can create notifications for users
CREATE POLICY "admins_create_notifications"
ON notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Policy 4: Users can delete their own notifications
CREATE POLICY "users_delete_own_notifications"
ON notifications
FOR DELETE
USING (user_id = auth.uid());
```

---

### Table: `system_config`

This table stores system-wide configuration settings.

**⚠️ CRITICAL: Admin-only access!**

#### Enable RLS

```sql
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: Anyone (authenticated) can read config
CREATE POLICY "authenticated_read_config"
ON system_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy 2: Only admins can modify config
CREATE POLICY "admins_modify_config"
ON system_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);
```

---

### Table: `event_schedule`

This table stores event schedule information.

#### Enable RLS

```sql
ALTER TABLE event_schedule ENABLE ROW LEVEL SECURITY;
```

#### Policies

```sql
-- Policy 1: All authenticated users can view schedule
CREATE POLICY "authenticated_view_schedule"
ON event_schedule
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy 2: Only admins can modify schedule
CREATE POLICY "admins_modify_schedule"
ON event_schedule
FOR INSERT, UPDATE, DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);
```

---

## Helper Functions

Create these helper functions for easier policy management:

```sql
-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is team captain
CREATE OR REPLACE FUNCTION is_team_captain(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_uuid
    AND captain_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION is_team_member(user_uuid UUID, team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = user_uuid
    AND team_id = team_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Now you can use these in policies:

```sql
-- Example: Simplified admin check
CREATE POLICY "admins_manage_data"
ON some_table
FOR ALL
USING (is_admin(auth.uid()));
```

---

## Testing RLS Policies

### Test as Regular User

```sql
-- Set role to authenticated user (replace with actual user UUID)
SET request.jwt.claims.sub TO 'user-uuid-here';

-- Try to access data
SELECT * FROM registrations;
SELECT * FROM teams;
SELECT * FROM user_roles;
```

### Test as Admin

```sql
-- Set role to admin user
SET request.jwt.claims.sub TO 'admin-uuid-here';

-- Should have broader access
SELECT * FROM registrations;
SELECT * FROM teams;
SELECT * FROM system_config;
```

### Reset Session

```sql
RESET request.jwt.claims.sub;
```

---

## Common RLS Patterns

### Pattern 1: User Owns Resource

```sql
USING (auth.uid() = user_id)
```

### Pattern 2: User is Team Member

```sql
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
)
```

### Pattern 3: User is Admin

```sql
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
```

### Pattern 4: Public Read, Authenticated Write

```sql
-- Public read
CREATE POLICY "public_read" ON table FOR SELECT USING (true);

-- Authenticated write
CREATE POLICY "authenticated_write" ON table FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Verification Script

Run this complete verification script to audit all RLS policies:

```sql
-- Complete RLS Audit Script
DO $$
DECLARE
  table_rec RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== RLS AUDIT REPORT ===';
  RAISE NOTICE '';
  
  FOR table_rec IN 
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    RAISE NOTICE 'Table: %', table_rec.tablename;
    RAISE NOTICE '  RLS Enabled: %', table_rec.rowsecurity;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_rec.tablename;
    
    RAISE NOTICE '  Policy Count: %', policy_count;
    
    IF NOT table_rec.rowsecurity THEN
      RAISE WARNING '  ⚠️  RLS NOT ENABLED!';
    END IF;
    
    IF policy_count = 0 THEN
      RAISE WARNING '  ⚠️  NO POLICIES DEFINED!';
    END IF;
    
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '=== END OF AUDIT ===';
END $$;
```

---

## Security Best Practices

### ✅ DO:

1. **Enable RLS on ALL tables** (except truly public ones)
2. **Test policies thoroughly** before deployment
3. **Use `WITH CHECK` in addition to `USING`** for INSERT/UPDATE
4. **Limit admin access** to specific email addresses or UUIDs
5. **Use helper functions** for complex policy logic
6. **Audit regularly** with the verification script
7. **Log policy violations** (Supabase does this automatically)

### ❌ DON'T:

1. **Never trust client-side filtering alone**
2. **Don't use `USING (true)`** unless data is truly public
3. **Don't forget** `DELETE` policies
4. **Don't give users** access to `user_roles` table modifications
5. **Don't expose** sensitive admin-only data
6. **Don't skip testing** policies with actual users
7. **Don't rely on** security through obscurity

---

## Deployment Checklist

Before going to production:

- [ ] RLS enabled on all tables
- [ ] Policies created for SELECT, INSERT, UPDATE, DELETE on each table
- [ ] Admin policies restrict to specific users/emails
- [ ] user_roles table is properly locked down
- [ ] Helper functions created and tested
- [ ] RLS verification script run successfully
- [ ] Tested as regular user (limited access confirmed)
- [ ] Tested as admin (full access confirmed)
- [ ] Tested as anonymous user (no access confirmed)
- [ ] Policy violations logged and monitored

---

## Getting Help

If you're unsure about any policy:

1. **Test in development** first
2. **Use Supabase Dashboard** → Authentication → Policies to visualize
3. **Check Supabase logs** for policy violations
4. **Consult Supabase RLS documentation**: https://supabase.com/docs/guides/auth/row-level-security

---

**Remember: RLS is your last line of defense. Even if client-side security is bypassed, RLS will protect your data!**
