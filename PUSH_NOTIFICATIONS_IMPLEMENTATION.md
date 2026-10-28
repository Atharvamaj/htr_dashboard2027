# Browser Push Notifications Implementation

## Overview
Added browser push notifications for all global (admin) and team notifications. Users will receive native browser notifications even when the dashboard tab is not in focus.

---

## Files Created

### 1. **Push Notification Utility**
**File:** `src/utils/pushNotifications.ts`

**Functions:**
- `requestNotificationPermission()` - Request permission from the browser
- `hasNotificationPermission()` - Check if permission is granted
- `showBrowserNotification()` - Display a browser notification
- `initializePushNotifications()` - Initialize and request permission on app load
- `showTeamNotification()` - Show a team notification with emoji prefix
- `showGlobalNotification()` - Show a global notification with emoji prefix

**Features:**
- ✅ Automatic permission request on first user interaction
- ✅ Graceful fallback if browser doesn't support notifications
- ✅ Auto-close after 10 seconds
- ✅ Focus window on notification click
- ✅ Custom icons and badges
- ✅ Tagged notifications (prevents duplicates)

---

## Files Modified

### 1. **NewUserNotifications Component**
**File:** `src/components/NewUserNotifications.tsx`

**Changes:**
1. Added import for push notification utilities
2. Initialize push notifications on component mount
3. Show browser notification on new user-specific notification (INSERT event)
4. Show browser notification on new global notification (INSERT event)

**Notification Format:**
- **Team Notifications:** `🎮 Team: [Title]`
- **Global Notifications:** `📢 Hack the Ridge: [Title]`

### 2. **TeamNotificationBanner Component**
**File:** `src/components/TeamNotificationBanner.tsx`

**Changes:**
1. Added import for push notification utilities
2. Initialize push notifications on component mount
3. Show browser notification for new team notifications
4. Show browser notification for replayed team notifications

**Notification Format:**
- **New Team Notifications:** `🎮 Team: [Title]`
- **Replayed Notifications:** `🎮 Team: 🔁 [Title]`

---

## How It Works

### Permission Flow:
```
1. User opens dashboard
   ↓
2. Push notifications initialize automatically
   ↓
3. If permission = "default" → Request permission
   ↓
4. User grants/denies permission
   ↓
5. If granted → Browser notifications enabled
   If denied → Silent fail (no notifications)
```

### Notification Trigger Flow:

#### For Team Notifications:
```
1. Admin sends team notification
   ↓
2. Real-time Supabase listener detects INSERT
   ↓
3. Check if notification is for current user
   ↓
4. If yes:
   - Play audio sound
   - Show in-app toast
   - Show browser push notification
```

#### For Global Notifications:
```
1. Admin sends global notification
   ↓
2. Real-time Supabase listener detects INSERT
   ↓
3. All users receive:
   - Play audio sound
   - Show in-app toast
   - Show browser push notification
```

---

## Browser Compatibility

### Supported Browsers:
✅ **Chrome/Edge** (Desktop & Mobile) - Full support  
✅ **Firefox** (Desktop & Mobile) - Full support  
✅ **Safari** (Desktop & iOS 16.4+) - Full support  
✅ **Opera** - Full support  

### Not Supported:
❌ **Safari iOS < 16.4** - Gracefully falls back (no browser notifications)  
❌ **Very old browsers** - Gracefully falls back (no browser notifications)

---

## User Experience

### First Visit:
1. User opens dashboard
2. Browser shows permission prompt: "Allow notifications from this site?"
3. User clicks "Allow" or "Block"

### After Permission Granted:
- User receives notifications even when:
  - Dashboard tab is not in focus
  - Dashboard is in a background tab
  - Dashboard is minimized
  - Dashboard is on another virtual desktop

### Notification Appearance:
**macOS/Windows:**
```
┌─────────────────────────────────────┐
│ 🎮 Team: Meeting in 5 minutes      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Please come to Room 124 for team   │
│ standup meeting.                    │
│                                     │
│ [Click to focus dashboard]          │
└─────────────────────────────────────┘
```

**Mobile:**
```
┌────────────────────────────────┐
│ 🎮 Team: Meeting in 5 min     │
│ Please come to Room 124...    │
└────────────────────────────────┘
```

---

## Testing

### Test Team Notifications:
1. ✅ Open dashboard as team member
2. ✅ Grant notification permission when prompted
3. ✅ Have admin send team notification from Admin panel
4. ✅ Verify you receive:
   - In-app sound
   - In-app toast popup
   - Browser push notification

### Test Global Notifications:
1. ✅ Open dashboard as any user (checked-in)
2. ✅ Grant notification permission when prompted
3. ✅ Have admin create global notification
4. ✅ Verify you receive:
   - In-app sound
   - In-app banner
   - Browser push notification

### Test Background Notifications:
1. ✅ Open dashboard in tab
2. ✅ Switch to another tab
3. ✅ Have admin send notification
4. ✅ Verify browser notification appears even in background

### Test Replay Notifications:
1. ✅ Open dashboard
2. ✅ Have admin replay a team notification
3. ✅ Verify you receive browser notification with 🔁 prefix

---

## Configuration

### Notification Duration:
- **Auto-close:** 10 seconds (configurable in `pushNotifications.ts`)
- Can be changed by modifying timeout value

### Notification Icons:
- **Default:** `/favicon.ico`
- Can be customized by passing `icon` option

### Notification Behavior:
- **requireInteraction:** `false` (auto-dismisses)
- **silent:** `false` (makes sound)
- Can be customized in function calls

---

## Security & Privacy

### What Information is Sent:
- ✅ Notification title
- ✅ Notification message
- ❌ No personal data
- ❌ No tracking

### Permission Persistence:
- Browser remembers permission choice per domain
- User can revoke permission anytime via browser settings

### Data Privacy:
- Notifications are shown locally by the browser
- No external services involved
- No data leaves the user's device

---

## Troubleshooting

### Notifications Not Showing:

**Check Permission:**
1. Open browser settings
2. Look for "Notifications" or "Permissions"
3. Ensure `htr-dashboard.pages.dev` (or your domain) is allowed

**Check Browser Support:**
```javascript
// In browser console:
"Notification" in window  // Should be true
Notification.permission   // Should be "granted"
```

**Check Console Logs:**
- Open DevTools → Console
- Look for messages like:
  - "Notification permission: granted"
  - "Browser notification shown: [title]"

### Permission Already Denied:

**How to Reset:**
1. Click lock icon in address bar
2. Click "Site Settings"
3. Change "Notifications" to "Allow"
4. Refresh page

---

## Future Enhancements

Possible improvements:
- Add notification action buttons (e.g., "Mark as Read", "Reply")
- Add notification grouping for multiple notifications
- Add do-not-disturb mode
- Add notification sound customization
- Add desktop notification history
- Add notification priority levels

---

## Technical Details

### Event Listeners:
- `user_notifications` table - For team notifications
- `notifications` table - For global notifications
- Both use Supabase real-time subscriptions

### Permission States:
- `"default"` - Not asked yet
- `"granted"` - User allowed
- `"denied"` - User blocked

### Notification Properties:
```typescript
{
  title: string;           // Main notification title
  body: string;            // Notification message
  icon: string;            // Icon URL (defaults to favicon)
  badge: string;           // Badge URL (for Android)
  tag: string;             // Unique ID (prevents duplicates)
  requireInteraction: bool; // Keep until dismissed
  silent: bool;            // Play sound or not
}
```

---

**Date:** 2025-10-06  
**Components Updated:** NewUserNotifications, TeamNotificationBanner  
**New Files:** pushNotifications.ts  
**Impact:** All users will receive browser push notifications
