# Admin Dashboard Fixes

This document contains instructions for fixing the two main issues with the admin dashboard:

1. **Admin users only seeing logged-in user instead of all users**
2. **403 permission denied errors when loading team invites**

## Quick Fix Instructions

### Step 1: Apply Database Policies

1. Open your Supabase project dashboard
2. Go to the **SQL Editor** tab
3. Open the `fix_rls_policies.sql` file from this project
4. Copy and paste the entire contents into a new SQL query
5. Click **Run** to apply all the RLS policy fixes

### Step 2: Ensure Admin User Setup

Make sure you have at least one admin user:

```sql
-- Check current admin status
SELECT user_id, email, full_name, is_admin 
FROM profiles 
WHERE email = 'YOUR_EMAIL@example.com';

-- If needed, make yourself an admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'YOUR_EMAIL@example.com';
```

### Step 3: Test the Fixes

1. **Test Admin Dashboard:**
   - Log in with your admin account
   - Go to the Admin Dashboard
   - Check the Users tab - you should now see all registered users
   - Try user management functions

2. **Test Team Invites:**
   - Log in as a regular user
   - Go to the participant dashboard
   - Team invites should load without 403 errors
   - Try accepting/declining invites

## What the Fixes Do

### RLS Policy Updates
- **Profiles table**: Admins can see all profiles, users can see their own + teammates
- **Team invites table**: Users can see invites sent to them, leaders can manage their team invites
- **Registrations table**: Admins can see all registrations, improved team member visibility
- **Teams table**: Better visibility for team members and invited users

### AdminUsers Component Improvements
- Multiple fallback strategies for loading user data
- Better error messages and troubleshooting guidance
- Clearer feedback about permission levels and data sources

### Key Benefits
- ✅ Admin users can see all users in the system
- ✅ No more 403 errors when loading team invites
- ✅ Proper access control while maintaining security
- ✅ Better user feedback and troubleshooting information

## Troubleshooting

If you still have issues after applying the fixes:

1. **Check admin status**: Ensure your user has `is_admin = true` in the profiles table
2. **Verify policies applied**: Check if the RLS policies were created successfully
3. **Check console logs**: Look for detailed error messages in the browser console
4. **Test with different users**: Try both admin and regular user accounts

## Files Modified

- `fix_rls_policies.sql` - Complete RLS policy fixes
- `src/components/AdminUsers.tsx` - Improved user loading and error handling
- `ADMIN_FIXES_README.md` - This instruction file

## Database Tables Affected

- `profiles` - User profile data and admin flags
- `registrations` - User registration data
- `team_invites` - Team invitation management
- `team_members` - Team membership data
- `teams` - Team information
- `notifications` - System notifications
- `schedule` - Event schedule
- `system_config` - System configuration

All tables now have proper RLS policies that balance security with functionality.