# Environment Variables Troubleshooting Guide

## 🔧 Issue: Changed API keys in .env but app doesn't work

### Why This Happens:
Vite caches environment variables when the dev server starts. Changes to `.env` files are **NOT** automatically reloaded.

---

## ✅ Solution: Restart the Dev Server

### Option 1: Kill and Restart (Recommended)

```bash
# 1. Stop the current dev server
# Press Ctrl+C in the terminal running npm run dev

# 2. Clear any cached processes
pkill -f vite

# 3. Start fresh
npm run dev
```

### Option 2: Full Clean Restart

If Option 1 doesn't work, do a complete clean:

```bash
# 1. Stop all Node processes
pkill -f node

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Restart
npm run dev
```

---

## 🔍 Verify Your .env File

Make sure your `.env` file has the correct format:

```bash
# Check the file (keys will be redacted for security)
grep VITE_SUPABASE .env | sed 's/=.*/=***/'
```

Should show:
```
VITE_SUPABASE_URL=***
VITE_SUPABASE_ANON_KEY=***
```

### Common Issues:

❌ **Extra spaces around =**
```bash
VITE_SUPABASE_URL = https://...  # WRONG
```

✅ **Correct format:**
```bash
VITE_SUPABASE_URL=https://...    # CORRECT
```

❌ **Quotes when not needed**
```bash
VITE_SUPABASE_URL="https://..."  # Usually not needed
```

✅ **No quotes (preferred):**
```bash
VITE_SUPABASE_URL=https://...    # CORRECT
```

❌ **Missing VITE_ prefix**
```bash
SUPABASE_URL=https://...         # WRONG - won't be loaded!
```

✅ **With VITE_ prefix:**
```bash
VITE_SUPABASE_URL=https://...    # CORRECT
```

---

## 🧪 Test Your Connection

After restarting the dev server:

### 1. Check Browser Console

Open DevTools (F12) → Console tab, look for:
- ✅ No "Invalid API key" errors
- ✅ No "Failed to connect to Supabase" errors
- ✅ Successful authentication logs

### 2. Test Authentication

1. Go to `/auth` route
2. Enter your email
3. Try to send OTP code
4. Check for errors

### 3. Check Network Tab

DevTools → Network tab:
- Look for requests to `*.supabase.co`
- Check for 401 (Unauthorized) or 403 (Forbidden) errors
- These indicate invalid API keys

---

## 🔑 Verify Your Supabase Keys

### Get Your Keys:

1. Go to https://app.supabase.com
2. Select your project
3. **Settings** → **API**
4. Copy these values:

```
Project URL: https://[your-project].supabase.co
anon/public key: eyJhbGc...
```

### Update .env:

```bash
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Important:** Use the **anon** key, NOT the service_role key!

---

## 🚨 Common Errors & Fixes

### Error: "Invalid API key"

**Cause:** Wrong key or old cached key

**Fix:**
```bash
# 1. Double-check your key in Supabase dashboard
# 2. Update .env with correct key
# 3. Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

### Error: "Failed to connect to Supabase"

**Cause:** Wrong URL or project paused

**Fix:**
1. Check if your Supabase project is active (free tier pauses after 7 days)
2. Verify URL format: `https://[project-id].supabase.co` (no trailing slash)
3. Check firewall/network isn't blocking Supabase

### Error: "Session could not be loaded"

**Cause:** Old session with old API key

**Fix:**
```bash
# Clear browser storage
# 1. Open DevTools (F12)
# 2. Application tab → Storage → Clear site data
# 3. Refresh page
```

Or clear programmatically:
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Error: CORS / Network Error

**Cause:** Supabase project settings

**Fix:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Scroll to **API Settings**
3. Add `http://localhost:5173` to allowed origins (if not already there)

---

## 📝 Quick Checklist

After changing API keys, verify:

- [ ] Stopped the dev server (Ctrl+C)
- [ ] Killed any remaining Vite processes
- [ ] Updated `.env` with new keys (no extra spaces)
- [ ] Verified keys in Supabase dashboard match `.env`
- [ ] Cleared browser storage (localStorage + sessionStorage)
- [ ] Deleted `node_modules/.vite` cache
- [ ] Restarted dev server with `npm run dev`
- [ ] Checked browser console for errors
- [ ] Tested authentication flow

---

## 🔄 Start Fresh Script

Save this as a script to quickly reset everything:

```bash
#!/bin/bash
# restart-dev.sh

echo "🛑 Stopping dev server..."
pkill -f vite
sleep 1

echo "🧹 Clearing cache..."
rm -rf node_modules/.vite

echo "🚀 Starting dev server..."
npm run dev
```

Make it executable:
```bash
chmod +x restart-dev.sh
./restart-dev.sh
```

---

## 💡 Pro Tips

### 1. Use Environment-Specific Files

For different environments:
```
.env                 # Default values
.env.local          # Local overrides (gitignored)
.env.development    # Development-specific
.env.production     # Production-specific
```

Vite loads them in this order (last wins):
1. `.env`
2. `.env.local`
3. `.env.[mode]` (e.g., `.env.development`)
4. `.env.[mode].local`

### 2. Verify Variables are Loaded

Add temporary logging in your code:

```typescript
// src/main.tsx or src/App.tsx
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has API Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

Remove after debugging!

### 3. Check for Typos

Variable names are case-sensitive:
- ✅ `VITE_SUPABASE_URL`
- ❌ `VITE_SUPABASE_url` (wrong case)
- ❌ `VITE_SUPABAS_URL` (typo)

---

## 📞 Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Check Supabase Status**: https://status.supabase.com
2. **Review Logs**: Check terminal for Vite errors
3. **Test API Key Directly**: Use `curl` to test:

```bash
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://YOUR_PROJECT.supabase.co/rest/v1/
```

Should return: `{"message":"The server is running"}`

4. **Create New Keys**: In Supabase → Settings → API → Rotate keys

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Dev server starts without errors
- ✅ No console errors about API keys
- ✅ Can send OTP code to email
- ✅ Can authenticate successfully
- ✅ Dashboard loads after login

---

Need more help? Check:
- Vite docs: https://vitejs.dev/guide/env-and-mode
- Supabase docs: https://supabase.com/docs/guides/api
