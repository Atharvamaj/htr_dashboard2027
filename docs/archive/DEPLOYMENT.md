# Deployment Guide

This guide covers different ways to deploy HTR Dashboard to production.

## Quick Deployment Options

### 1. Vercel (Recommended)

Vercel provides the easiest deployment experience for React applications.

**One-Click Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aidenpinto/htr-dashboard)

**Manual Deployment:**

1. Fork this repository
2. Sign up at [vercel.com](https://vercel.com)
3. Connect your GitHub account
4. Import your forked repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

### 2. Netlify

1. Build the project locally: `npm run build`
2. Drag and drop the `dist` folder to [netlify.com/drop](https://netlify.com/drop)
3. Set up environment variables in Netlify dashboard
4. Configure redirects for SPA routing (see below)

### 3. Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init hosting

# Build the project
npm run build

# Deploy
firebase deploy
```

## Environment Variables

All deployment platforms need these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## SPA Routing Configuration

Since this is a Single Page Application (SPA), you need to configure your hosting provider to serve `index.html` for all routes.

### Vercel

Create `vercel.json` in the project root:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Netlify

Create `_redirects` file in the `public` directory:

```
/*    /index.html   200
```

### Apache

Create `.htaccess` file in the project root:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

### Nginx

Add to your Nginx configuration:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Database Setup

### Supabase Cloud

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and keys
3. Run migrations:
   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_ID
   
   # Push migrations
   supabase db push
   ```

### Local Supabase (Development)

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset
```

## Build Optimization

### Bundle Analysis

To analyze your bundle size:

```bash
npm install -g vite-bundle-analyzer
npm run build
npx vite-bundle-analyzer dist
```

### Performance Optimizations

The build includes warnings about large chunks. Consider:

1. **Code Splitting**: Use dynamic imports for large components
   ```typescript
   const LazyComponent = lazy(() => import('./LazyComponent'));
   ```

2. **Tree Shaking**: Ensure you're only importing what you need
   ```typescript
   // Good
   import { Button } from './ui/button';
   
   // Avoid
   import * as UI from './ui';
   ```

3. **Image Optimization**: Optimize images before including them

## Custom Domain

### Vercel

1. Go to your project dashboard
2. Settings > Domains
3. Add your custom domain
4. Configure DNS as instructed

### Netlify

1. Site settings > Domain management
2. Add custom domain
3. Configure DNS records

## SSL Certificates

Most modern hosting providers (Vercel, Netlify, Firebase) provide automatic SSL certificates. For custom servers:

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --webroot -w /path/to/your/dist -d yourdomain.com
```

## Monitoring and Analytics

### Vercel Analytics

Add to your Vercel project:

```bash
npm install @vercel/analytics
```

```typescript
// In your main component
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

### Google Analytics

1. Create a Google Analytics property
2. Add the tracking code to your `index.html`

## Troubleshooting

### Build Failures

**Problem**: TypeScript errors during build
**Solution**: Run `npm run type-check` locally and fix errors

**Problem**: Out of memory during build
**Solution**: Increase Node.js memory limit:
```bash
export NODE_OPTIONS="--max_old_space_size=4096"
npm run build
```

### Runtime Errors

**Problem**: Blank page after deployment
**Solution**: Check browser console for errors, ensure environment variables are set

**Problem**: 404 errors on page refresh
**Solution**: Configure SPA routing (see above)

### Performance Issues

**Problem**: Slow loading times
**Solution**: 
- Enable gzip compression on your server
- Implement code splitting
- Optimize images
- Use a CDN

## Security Checklist

Before deploying to production:

- [ ] All environment variables are properly set
- [ ] Supabase RLS policies are configured
- [ ] No sensitive data in client-side code
- [ ] HTTPS is enabled
- [ ] Security headers are configured

## Backup Strategy

### Database Backups

Supabase provides automatic backups, but for additional safety:

```bash
# Create manual backup
supabase db dump > backup.sql

# Restore from backup
supabase db reset
psql -h db.your-project.supabase.co -p 5432 -d postgres -U postgres < backup.sql
```

### Code Backups

- Use Git for version control
- Regular pushes to remote repository
- Tag releases for rollback capability

## Scaling Considerations

### Database Scaling

1. Monitor query performance in Supabase dashboard
2. Add indexes for frequently queried columns
3. Consider read replicas for high traffic

### Application Scaling

1. Use CDN for static assets
2. Implement caching strategies
3. Consider serverless functions for heavy operations

## Support

For deployment-specific issues:

1. Check the [Issues](https://github.com/aidenpinto/htr-dashboard/issues) page
2. Consult your hosting provider's documentation
3. Create a new issue with deployment details
