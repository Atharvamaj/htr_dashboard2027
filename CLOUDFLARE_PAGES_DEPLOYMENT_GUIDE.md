# 🚀 Complete Guide: Deploy HTR Dashboard to Cloudflare Pages

This guide will walk you through deploying your HTR Dashboard to Cloudflare Pages using your GitHub repository.

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ A GitHub account
- ✅ Your code pushed to a GitHub repository
- ✅ A Cloudflare account (free tier works!)
- ✅ Your Supabase project URL and anon key ready

---

## Part 1: Push Your Code to GitHub

### Step 1: Create a GitHub Repository (if you haven't already)

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name:** `htr-dashboard` (or your preferred name)
   - **Description:** "Hack the Ridge Dashboard"
   - **Visibility:** Choose Public or Private
   - **DO NOT** initialize with README (since you already have code)
4. Click **"Create repository"**

### Step 2: Push Your Code to GitHub

Open your terminal and run these commands from your project directory:

```bash
# Navigate to your project (if not already there)
cd /Users/aidenpinto/Downloads/htr2/htr-dashboard

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - Ready for Cloudflare Pages deployment"

# Add your GitHub repository as remote
# Replace YOUR_USERNAME and YOUR_REPO with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

**Note:** If your default branch is `master` instead of `main`, use:
```bash
git push -u origin master
```

### Step 3: Verify Upload

1. Go to your GitHub repository URL: `https://github.com/YOUR_USERNAME/YOUR_REPO`
2. You should see all your files there
3. ✅ Confirm you see: `src/`, `dist/`, `package.json`, etc.

---

## Part 2: Deploy to Cloudflare Pages

### Step 4: Access Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Log in (or create a free account if you don't have one)
3. In the left sidebar, click **"Workers & Pages"**
4. Click the **"Create application"** button
5. Select the **"Pages"** tab
6. Click **"Connect to Git"**

### Step 5: Connect Your GitHub Repository

1. Click **"Connect GitHub"**
2. A popup will appear asking for GitHub authorization
3. Click **"Authorize Cloudflare Pages"**
4. Select your repository:
   - **Option A:** Select "All repositories" (easier)
   - **Option B:** Select "Only select repositories" and choose your HTR Dashboard repo
5. Click **"Install & Authorize"**
6. You'll be redirected back to Cloudflare

### Step 6: Configure Your Build Settings

On the "Set up builds and deployments" page, configure:

#### Basic Settings:
- **Project name:** `htr-dashboard` (or your preferred subdomain)
  - This will become: `htr-dashboard.pages.dev`
- **Production branch:** `main` (or `master` if that's your default)

#### Build Settings:
- **Framework preset:** Select **"None"** or **"Vite"** from dropdown
- **Build command:** 
  ```
  npm run build
  ```
- **Build output directory:** 
  ```
  dist
  ```
- **Root directory:** Leave empty (or `/`)

#### Advanced Settings (Optional):
- **Node version:** `18` or `20` (recommended)

### Step 7: Add Environment Variables ⚠️ CRITICAL

**BEFORE** clicking "Save and Deploy", you must add your environment variables:

1. Scroll down to **"Environment variables (advanced)"**
2. Click **"Add variable"** for each of these:

#### Required Variables:

| Variable Name | Value | Where to Get It |
|---------------|-------|-----------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` (long string) | Supabase Dashboard → Settings → API → anon public key |
| `VITE_ENVIRONMENT` | `production` | Type exactly as shown |
| `VITE_ENABLE_DEBUG_LOGS` | `false` | Type exactly as shown |

#### Optional Variables (can add later):

| Variable Name | Default Value | Purpose |
|---------------|---------------|---------|
| `VITE_SESSION_TIMEOUT` | `3600` | Session timeout in seconds |
| `VITE_MAX_LOGIN_ATTEMPTS` | `5` | Max failed login attempts |

**How to Add Each Variable:**
1. Click **"+ Add variable"**
2. Enter the **Variable name** (e.g., `VITE_SUPABASE_URL`)
3. Enter the **Value** (e.g., your Supabase URL)
4. Click **"Save"**
5. Repeat for all variables

### Step 8: Deploy!

1. After adding all environment variables, click **"Save and Deploy"**
2. Cloudflare will start building your site
3. You'll see a build log showing the progress:
   ```
   > Building...
   > Installing dependencies
   > Running build command
   > Deploying to Cloudflare Pages
   ```
4. Wait 2-5 minutes for the build to complete

### Step 9: Access Your Deployed Site

1. Once the build succeeds, you'll see: **"Success! Your site is live!"**
2. Your site URL will be: `https://your-project-name.pages.dev`
3. Click **"View build"** or **"Visit site"** to see it live!

---

## Part 3: Post-Deployment Verification

### Step 10: Test Your Deployment

Visit your site and test these features:

#### ✅ Basic Functionality:
- [ ] Homepage loads
- [ ] Can navigate to /auth
- [ ] Sign in/sign up form appears
- [ ] No console errors (open DevTools with F12)

#### ✅ Authentication:
- [ ] Can create a new account
- [ ] Can sign in with existing account
- [ ] Session persists after page refresh
- [ ] Can sign out

#### ✅ Dashboard:
- [ ] Dashboard loads after login
- [ ] Can see notifications
- [ ] Can access team management
- [ ] Can view schedule

#### ✅ Admin (if applicable):
- [ ] Admin users can access admin panel
- [ ] Can manage teams
- [ ] Can manage users

### Step 11: Check for Common Issues

If something doesn't work:

#### Issue: "Failed to load" or connection errors
**Solution:** Check your environment variables:
1. Go to Cloudflare Pages → Your Project → Settings → Environment variables
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
3. If wrong, update them and redeploy (see Step 15)

#### Issue: "CSP violation" errors in console
**Solution:** Your `_headers` file should handle this, but if needed:
1. Check browser console for specific CSP errors
2. May need to update CSP policy in `public/_headers`

#### Issue: 404 errors on routes
**Solution:** 
1. Verify `dist/_redirects` file exists
2. Should contain: `/*    /index.html   200`
3. This enables SPA routing

---

## Part 4: Managing Your Deployment

### Step 12: Custom Domain (Optional)

To use your own domain like `dashboard.yoursite.com`:

1. In Cloudflare Pages → Your Project → **Custom domains**
2. Click **"Set up a custom domain"**
3. Enter your domain/subdomain
4. Follow Cloudflare's instructions to:
   - Add DNS records (CNAME)
   - Verify domain ownership
5. SSL certificate will be provisioned automatically (5-10 min)

### Step 13: Branch Deployments

Cloudflare automatically creates preview deployments for every branch:

- **Production:** Deploys from your main/master branch
  - URL: `https://your-project.pages.dev`
- **Preview:** Deploys from other branches
  - URL: `https://branch-name.your-project.pages.dev`

**Example workflow:**
```bash
# Create a feature branch
git checkout -b add-new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin add-new-feature
```

Cloudflare will automatically deploy this to a preview URL!

### Step 14: View Build Logs

If a deployment fails:

1. Go to Cloudflare Pages → Your Project
2. Click on the failed deployment
3. Click **"View build log"**
4. Look for error messages in red
5. Common issues:
   - Missing dependencies: Run `npm install` locally first
   - Build errors: Fix TypeScript/ESLint errors
   - Wrong Node version: Change in Settings

### Step 15: Redeploy Your Site

**To trigger a new deployment:**

#### Option A: Push new code
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Cloudflare will auto-deploy!

#### Option B: Retry failed build
1. Go to Cloudflare Pages → Your Project
2. Click the failed deployment
3. Click **"Retry deployment"**

#### Option C: Manual redeploy (no code changes)
1. Go to Cloudflare Pages → Your Project
2. Click **"Deployments"** tab
3. Click three dots on any deployment
4. Click **"Retry"** or **"Rollback to this deployment"**

### Step 16: Update Environment Variables

If you need to change environment variables after deployment:

1. Go to Cloudflare Pages → Your Project → **Settings**
2. Scroll to **"Environment variables"**
3. Click **Edit** on the variable you want to change
4. Update the value
5. Click **Save**
6. **Important:** You must trigger a new deployment for changes to take effect:
   - Either push a new commit, or
   - Go to Deployments → Retry latest deployment

---

## Part 5: Monitoring and Maintenance

### Step 17: Monitor Your Deployment

#### View Analytics:
1. Cloudflare Pages → Your Project → **Analytics**
2. See: Page views, unique visitors, bandwidth, requests

#### View Real-time Logs:
1. Use browser DevTools (F12) for frontend errors
2. Check Supabase logs for backend/database issues:
   - Supabase Dashboard → Logs → Edge Functions / Database

#### Set Up Alerts (Optional):
1. In Cloudflare Dashboard → Notifications
2. Create alerts for deployment failures

### Step 18: Rollback if Needed

If a deployment breaks something:

1. Go to Cloudflare Pages → Your Project → **Deployments**
2. Find a working previous deployment
3. Click the three dots → **"Rollback to this deployment"**
4. Confirm the rollback
5. Your site will immediately revert to that version

---

## 📊 Quick Reference Commands

### Local Development:
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Git Commands:
```bash
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub (triggers deployment)
git push origin main

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main
```

---

## 🔧 Troubleshooting

### Build Fails with "Module not found"
**Solution:**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Commit the updated package-lock.json
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Environment Variables Not Working
**Solution:**
1. Variable names must start with `VITE_` for Vite to expose them
2. After changing variables, you MUST redeploy
3. Check for typos in variable names (case-sensitive!)

### Site Works Locally But Not on Cloudflare
**Solution:**
1. Check Console for errors (F12)
2. Verify all environment variables are set in CF Pages
3. Ensure `VITE_ENVIRONMENT=production` is set
4. Check that `_headers` and `_redirects` are in the `dist/` folder

### "This site can't be reached"
**Solution:**
1. Wait 5-10 minutes for DNS propagation
2. Try clearing browser cache (Ctrl+Shift+Delete)
3. Try in incognito/private browsing mode
4. Check Cloudflare Pages status page

---

## 📚 Useful Links

- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Your Deployments:** https://dash.cloudflare.com → Workers & Pages → Your Project
- **Supabase Dashboard:** https://app.supabase.com
- **GitHub Repo:** `https://github.com/YOUR_USERNAME/YOUR_REPO`

---

## ✅ Deployment Checklist

Use this checklist when deploying:

- [ ] Code pushed to GitHub repository
- [ ] Cloudflare Pages project created
- [ ] GitHub repository connected to Cloudflare
- [ ] Build settings configured:
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `dist`
- [ ] Environment variables added:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_ENVIRONMENT=production`
  - [ ] `VITE_ENABLE_DEBUG_LOGS=false`
- [ ] First deployment successful
- [ ] Site accessible at `.pages.dev` URL
- [ ] Authentication tested and working
- [ ] Dashboard loads correctly
- [ ] Admin panel accessible (if applicable)
- [ ] No console errors
- [ ] Custom domain configured (if applicable)

---

## 🎉 Congratulations!

Your HTR Dashboard is now live on Cloudflare Pages!

**Your site:** `https://your-project-name.pages.dev`

Every time you push to GitHub, Cloudflare will automatically rebuild and deploy your site. It's that simple!

---

**Need Help?**
- Check the troubleshooting section above
- Review build logs in Cloudflare Pages
- Check browser console for frontend errors (F12)
- Review Supabase logs for backend issues

**Happy Deploying! 🚀**
