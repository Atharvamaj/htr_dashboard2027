# Push Notification Branding Update

## Overview
Updated browser push notifications to use HTR branding and professional icons instead of generic emojis.

---

## Changes Made

### 1. **Notification Icon**
**File:** `src/utils/pushNotifications.ts`

**Before:**
- Icon: `/favicon.ico` (generic browser icon)

**After:**
- Icon: `/htr_logo_transparent.svg` (HTR logo)

**Location:** Line 59

### 2. **Team Notification Emoji**
**File:** `src/utils/pushNotifications.ts`

**Before:**
- Emoji: 🎮 (game controller - too gaming-focused)
- Format: `🎮 Team: [Title]`

**After:**
- Emoji: 💡 (light bulb - represents ideas/innovation)
- Format: `💡 Team: [Title]`

**Location:** Line 111

### 3. **Global Notification Emoji**
**File:** `src/utils/pushNotifications.ts`

**Before:**
- Emoji: 📢 (megaphone - generic announcement)
- Format: `📢 Hack the Ridge: [Title]`

**After:**
- Emoji: 🏔️ (mountain - represents "Ridge" in Hack the Ridge)
- Format: `🏔️ Hack the Ridge: [Title]`

**Location:** Line 123

### 4. **Logo File**
**Action:** Copied HTR logo to public directory

**Source:** `src/assets/htr_logo_transparent.svg`  
**Destination:** `public/htr_logo_transparent.svg`

**Reason:** Browser notifications can only access files from the public directory, not bundled assets.

---

## Visual Changes

### Before:
```
┌─────────────────────────────────────┐
│ 🎮 Team: Meeting reminder         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [favicon.ico]  Team meeting in 5  │
│                minutes              │
└─────────────────────────────────────┘
```

### After:
```
┌─────────────────────────────────────┐
│ 💡 Team: Meeting reminder         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [HTR Logo]     Team meeting in 5  │
│                minutes              │
└─────────────────────────────────────┘
```

---

## Emoji Rationale

### 💡 Light Bulb (Team Notifications)
- **Meaning:** Ideas, innovation, collaboration
- **Why:** Represents team creativity and hackathon problem-solving
- **Professional:** Commonly used in tech/education contexts

### 🏔️ Mountain (Global Notifications)
- **Meaning:** "Ridge" from "Hack the Ridge"
- **Why:** Direct brand connection to the hackathon name
- **Professional:** Geographic reference, less casual than megaphone

---

## Browser Compatibility

### Logo Support:
✅ **Chrome/Edge** - Full SVG support  
✅ **Firefox** - Full SVG support  
✅ **Safari macOS** - Full SVG support  
⚠️ **Safari iOS** - May fallback to favicon if SVG not supported  
✅ **Opera** - Full SVG support  

**Note:** If SVG is not supported by the browser, it will gracefully fallback to the favicon.ico

---

## File Structure

```
htr-dashboard/
├── public/
│   ├── favicon.ico              (fallback icon)
│   ├── htr_logo_transparent.svg (NEW - notification icon)
│   ├── _headers
│   ├── _redirects
│   └── robots.txt
└── src/
    ├── assets/
    │   └── htr_logo_transparent.svg (bundled version)
    └── utils/
        └── pushNotifications.ts (updated)
```

---

## Testing

### Test Updated Notifications:

1. ✅ Clear browser cache (to ensure new logo is fetched)
2. ✅ Open dashboard and grant notification permission
3. ✅ Have admin send team notification
4. ✅ Verify notification shows:
   - 💡 emoji instead of 🎮
   - HTR logo as icon (not favicon)

5. ✅ Have admin send global notification
6. ✅ Verify notification shows:
   - 🏔️ emoji instead of 📢
   - HTR logo as icon

### Check Logo Loading:
Open browser DevTools → Network tab → Filter: `svg`  
Look for: `htr_logo_transparent.svg` (should load successfully)

---

## Deployment Notes

### When deploying to production:
1. ✅ Ensure `public/htr_logo_transparent.svg` is included in build
2. ✅ Verify the file is accessible at `https://your-domain.com/htr_logo_transparent.svg`
3. ✅ Test notifications on production to confirm logo appears

### Build verification:
```bash
npm run build
ls -la dist/htr_logo_transparent.svg  # Should exist
```

---

## Alternative Emoji Options

If you want to change the emojis in the future, here are some alternatives:

### Team Notifications:
- 💡 Light bulb (current)
- 👥 People
- 🤝 Handshake
- ⚡ Lightning bolt
- 🎯 Target
- 🚀 Rocket

### Global Notifications:
- 🏔️ Mountain (current)
- 📣 Megaphone
- ⚠️ Warning sign
- ℹ️ Information
- 🎪 Tent (event)
- 🏫 School

To change, edit the emoji in `src/utils/pushNotifications.ts` at the specified line numbers.

---

## Troubleshooting

### Logo not showing:
1. Check file exists: `ls public/htr_logo_transparent.svg`
2. Rebuild: `npm run build`
3. Check dist: `ls dist/htr_logo_transparent.svg`
4. Clear browser cache
5. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Wrong emoji showing:
1. Clear browser cache
2. Rebuild application: `npm run build`
3. Check code was saved: View `src/utils/pushNotifications.ts`

---

**Date:** 2025-10-06  
**Files Modified:** pushNotifications.ts  
**Files Added:** public/htr_logo_transparent.svg  
**Impact:** All push notifications now use HTR branding
