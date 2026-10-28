# Cloudflare Pages Deployment Guide

## 🚨 CRITICAL: Before You Deploy

### 1. Rotate Your Supabase API Keys

Your Supabase credentials are currently in `.env` files. Before deploying, you MUST rotate these keys:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Click **"Rotate"** next to the **anon/public key**
5. Save the new key securely (you'll need it for Cloudflare Pages)

**Why?** The old keys may have been exposed in your git history or local files.

---

## 📋 Pre-Deployment Checklist

- [ ] Supabase API keys rotated
- [ ] `.env` and `.env.production` not committed to git
- [ ] TypeScript strict mode enabled ✅ (Done)
- [ ] Security headers configured ✅ (Done)
- [ ] SPA redirects configured ✅ (Done)
- [ ] Build tested locally
- [ ] Supabase Row Level Security (RLS) policies verified

---

## 🚀 Deployment Steps

### Step 1: Connect Repository to Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git**
4. Select your repository: `htr-dashboard`
5. Click **Begin setup**

### Step 2: Configure Build Settings

Use these exact settings:

```yaml
Project name: htr-dashboard
Production branch: main
Build command: npm run build:prod
Build output directory: dist
Root directory: /
```

**Environment variables** (set in next step):
- Node.js version: `18` or `20` (recommended)

### Step 3: Set Environment Variables

In the Cloudflare Pages dashboard, add these environment variables:

#### Production Environment

Click **Add variable** for each:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `VITE_SUPABASE_URL` | `https://[your-project].supabase.co` | From Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (your NEW rotated key) | From Supabase Dashboard → Settings → API |
| `VITE_ENVIRONMENT` | `production` | Sets production mode |
| `VITE_ENABLE_DEBUG_LOGS` | `false` | Disables console logging |
| `VITE_SESSION_TIMEOUT` | `3600` | 1 hour session timeout |
| `VITE_MAX_LOGIN_ATTEMPTS` | `5` | Max login attempts before lockout |
| `NODE_VERSION` | `18` | Node.js version for build |

**Important:** 
- Never use the old keys from your `.env` file
- Use the NEW rotated keys from Supabase
- Set these for **both** Production and Preview environments

### Step 4: Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete (usually 2-3 minutes)
3. Cloudflare will provide a URL like: `https://htr-dashboard.pages.dev`

---

## 🔒 Post-Deployment Security Verification

### 1. Verify Security Headers

Open your deployed site and check headers using browser DevTools:

```bash
# Or use curl
curl -I https://your-site.pages.dev
```

Verify these headers are present:
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Strict-Transport-Security: max-age=31536000`
- ✅ `Content-Security-Policy: ...`

### 2. Test Authentication

1. Try to log in with a valid email
2. Verify OTP email is received
3. Complete authentication flow
4. Check that session persists on page refresh

### 3. Verify SPA Routing

Test these routes work correctly:
- `https://your-site.pages.dev/`
- `https://your-site.pages.dev/auth`
- `https://your-site.pages.dev/dashboard`
- `https://your-site.pages.dev/admin`

All should serve the app (not 404).

### 4. Check Supabase Connection

1. Open browser DevTools → Network tab
2. Navigate to the app
3. Verify connections to `*.supabase.co` are working
4. Check for any CORS errors (there should be none)

---

## 🔐 Supabase Row Level Security (RLS)

**CRITICAL:** Verify your RLS policies are correctly configured.

### Check RLS Status

In Supabase Dashboard → **Table Editor** → Select each table → Click shield icon

These tables MUST have RLS enabled:
- ✅ `profiles`
- ✅ `registrations`
- ✅ `teams`
- ✅ `notifications`
- ✅ `system_config`

### Example RLS Policies

If not already configured, add these policies:

#### Profiles Table
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id);
```

#### Registrations Table
```sql
-- Users can view their own registration
CREATE POLICY "Users can view own registration"
ON registrations FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own registration
CREATE POLICY "Users can create own registration"
ON registrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own registration
CREATE POLICY "Users can update own registration"
ON registrations FOR UPDATE
USING (auth.uid() = user_id);
```

#### System Config (Admin Only)
```sql
-- Only admins can view system config
CREATE POLICY "Admins can view system config"
ON system_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Only admins can update system config
CREATE POLICY "Admins can update system config"
ON system_config FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);
```

---

## 🌐 Custom Domain Setup (Optional)

### 1. Add Custom Domain

1. In Cloudflare Pages → Your project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `hacktheridge.com`)
4. Follow DNS configuration instructions

### 2. DNS Configuration

If your domain is on Cloudflare:
- CNAME record will be added automatically

If your domain is elsewhere:
- Add CNAME record: `hacktheridge.com` → `htr-dashboard.pages.dev`

### 3. SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

---

## 📊 Monitoring & Maintenance

### Cloudflare Analytics

Access in dashboard:
- **Analytics & Logs** → Web Analytics
- Monitor traffic, performance, security events

### Error Tracking (Recommended)

Consider integrating error tracking:
- [Sentry](https://sentry.io/) - Error tracking & performance monitoring
- [LogRocket](https://logrocket.com/) - Session replay
- [Datadog](https://www.datadoghq.com/) - Full observability

Add to `package.json`:
```bash
npm install @sentry/react @sentry/vite-plugin
```

### Supabase Monitoring

Monitor in Supabase Dashboard:
- **Database** → **Usage** - Check query performance
- **Auth** → **Users** - Monitor user activity
- **Logs** - Check for errors or suspicious activity

---

## 🔄 Continuous Deployment

Cloudflare Pages automatically deploys when you push to git:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Cloudflare automatically:
# 1. Detects the push
# 2. Builds the project
# 3. Deploys to production
# 4. Updates https://htr-dashboard.pages.dev
```

### Preview Deployments

Every pull request gets a preview deployment:
- URL: `https://[branch].[project].pages.dev`
- Test changes before merging
- Preview URLs are secure (require auth same as prod)

---

## 🚨 Troubleshooting

### Build Fails

**Error:** `Missing environment variables`
- **Fix:** Add all required variables in Cloudflare Pages dashboard

**Error:** `npm install fails`
- **Fix:** Check `package.json` for correct dependencies
- Try: `npm install --legacy-peer-deps`

### 404 on Routes

**Error:** `/dashboard` returns 404
- **Fix:** Verify `_redirects` file exists in `public/` folder
- Content should be: `/* /index.html 200`

### Supabase Connection Failed

**Error:** `Failed to connect to Supabase`
- **Fix:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase project is not paused (free tier pauses after 7 days inactivity)

### CORS Errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`
- **Fix:** In Supabase Dashboard → **Settings** → **API**
- Add your Cloudflare Pages URL to allowed origins

### TypeScript Errors After Strict Mode

**Error:** Various TypeScript errors after enabling strict mode
- **Expected:** This is normal - strict mode catches bugs early
- **Fix:** Run `npm run type-check` to see all errors
- Fix errors incrementally or temporarily disable specific checks

---

## 📞 Support

- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **Supabase Docs:** https://supabase.com/docs
- **Security Issues:** Review `SECURITY_AUDIT_REPORT.md`

---

## ✅ Deployment Verification Checklist

After deployment, verify:

- [ ] Site loads at Cloudflare Pages URL
- [ ] Authentication works (OTP email received)
- [ ] Dashboard displays correctly after login
- [ ] Admin panel accessible (if admin user)
- [ ] No console errors in browser DevTools
- [ ] Security headers present (check with curl)
- [ ] All routes work (no 404s)
- [ ] Supabase connection working
- [ ] Dark/light theme toggle works
- [ ] Mobile responsive design works

---

## 🎉 You're Live!

Your HTR Dashboard is now securely deployed on Cloudflare Pages with:
- ✅ Automatic HTTPS
- ✅ Global CDN distribution
- ✅ Security headers enabled
- ✅ DDoS protection
- ✅ Automatic deployments from git
- ✅ Unlimited bandwidth (on Cloudflare Free tier)

**Next Steps:**
1. Share the URL with your team
2. Test thoroughly in production
3. Monitor for errors in Cloudflare Analytics
4. Review `SECURITY_AUDIT_REPORT.md` for remaining improvements
