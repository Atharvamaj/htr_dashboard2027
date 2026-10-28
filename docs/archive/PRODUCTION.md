# HTR Dashboard - Production Deployment Guide

This guide covers deploying the HTR Dashboard to production with optimal performance, security, and reliability.

## 🚀 Quick Start

### Automated Deployment
```bash
# Run the production deployment script
./deploy.sh

# With preview mode (recommended for first deployment)
./deploy.sh --preview

# Skip tests if already validated
./deploy.sh --skip-tests
```

### Manual Deployment
```bash
# 1. Install dependencies
npm ci

# 2. Build for production
npm run build:prod

# 3. Deploy the dist/ directory to your hosting platform
```

## 📋 Pre-Deployment Checklist

### Environment Configuration
- [ ] Create `.env.production` with production values
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Configure `VITE_ENVIRONMENT=production`
- [ ] Set `VITE_ENABLE_DEBUG_LOGS=false`
- [ ] Configure rate limiting and security settings

### Security Verification
- [ ] All API keys are properly secured
- [ ] CORS settings are configured correctly
- [ ] Security headers are implemented
- [ ] Input sanitization is in place
- [ ] Rate limiting is configured

### Performance Optimization
- [ ] Bundle size is optimized (< 2MB recommended)
- [ ] Images are compressed and optimized
- [ ] Lazy loading is implemented
- [ ] Caching strategies are configured
- [ ] Service worker is enabled

### Testing & Quality
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compilation succeeds (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build completes successfully (`npm run build:prod`)

## 🏗️ Deployment Options

### 1. Static Hosting (Vercel, Netlify, GitHub Pages)

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build:prod
netlify deploy --prod --dir=dist
```

#### Configuration Files
- `vercel.json` - Vercel configuration (if needed)
- `netlify.toml` - Netlify configuration (if needed)
- `_redirects` - SPA routing configuration

### 2. Docker Deployment

#### Build Docker Image
```bash
# Build the image
docker build -t htr-dashboard .

# Run locally
docker run -p 80:80 htr-dashboard

# Deploy to container registry
docker tag htr-dashboard your-registry/htr-dashboard:latest
docker push your-registry/htr-dashboard:latest
```

#### Docker Compose
```yaml
version: '3.8'
services:
  htr-dashboard:
    image: htr-dashboard:latest
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. CDN Deployment

#### AWS CloudFront
1. Upload build files to S3 bucket
2. Create CloudFront distribution
3. Configure origin and behaviors
4. Set up custom domain and SSL certificate
5. Configure error pages for SPA routing

#### Cloudflare
1. Upload files to Cloudflare Pages
2. Configure build settings
3. Set up environment variables
4. Configure redirects for SPA routing

## 🔒 Security Configuration

### Required Security Headers
The nginx configuration includes these security headers:
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000`
- `Content-Security-Policy` (configured for Supabase)
- `Referrer-Policy: strict-origin-when-cross-origin`

### Environment Variables Security
```bash
# Production environment variables (set on hosting platform)
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG_LOGS=false
VITE_ENABLE_ERROR_REPORTING=true
```

### Rate Limiting
Default configurations:
- General requests: 60/minute
- API requests: 5/second
- Login attempts: 5 maximum with 15-minute lockout

## ⚡ Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze

# Check performance metrics
npm run perf:audit
```

### Optimization Features
- **Code Splitting**: Automatic chunk splitting by vendor
- **Tree Shaking**: Dead code elimination
- **Minification**: CSS and JS minification
- **Compression**: Gzip/Brotli compression
- **Caching**: Service worker with intelligent caching
- **Lazy Loading**: Route-based code splitting
- **Image Optimization**: WebP/AVIF support

### Performance Targets
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle Size**: < 2MB total

## 📊 Monitoring & Analytics

### Error Tracking
Configure error monitoring service:
```javascript
// In production, integrate with services like:
// - Sentry
// - LogRocket
// - Bugsnag
// - Rollbar
```

### Performance Monitoring
The application includes built-in performance monitoring:
- Core Web Vitals tracking
- Bundle size analysis
- Network performance metrics
- Memory usage monitoring

### Analytics
Integrate with analytics services:
- Google Analytics 4
- Mixpanel
- Amplitude
- Custom analytics

## 🔧 Hosting Platform Configurations

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Netlify Configuration (`netlify.toml`)
```toml
[build]
  publish = "dist"
  command = "npm run build:prod"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
rm -rf .tsbuildinfo

# Check for TypeScript errors
npm run type-check
```

#### Runtime Errors
1. Check browser console for errors
2. Verify environment variables are set
3. Check network requests in DevTools
4. Verify Supabase configuration

#### Performance Issues
1. Analyze bundle size: `npm run build:analyze`
2. Check Core Web Vitals in DevTools
3. Use Lighthouse for performance audit
4. Monitor network requests

#### Security Issues
1. Verify CSP headers are not blocking resources
2. Check CORS configuration
3. Validate SSL certificate
4. Review security headers

### Getting Help
1. Check the console for error messages
2. Review build logs for deployment issues
3. Check hosting platform documentation
4. Verify environment configuration
5. Test in different browsers and devices

## 📈 Post-Deployment Tasks

### Monitoring Setup
1. Configure error tracking service
2. Set up performance monitoring
3. Configure analytics
4. Set up uptime monitoring
5. Configure alerting for critical issues

### SEO Optimization
1. Configure robots.txt
2. Set up sitemap.xml
3. Configure meta tags
4. Set up structured data
5. Configure social media cards

### Maintenance
1. Set up automated backups
2. Configure dependency updates
3. Set up security scanning
4. Plan for regular performance audits
5. Document deployment procedures

## 🎯 Success Metrics

After deployment, monitor these key metrics:

### Performance
- Page load times < 3s
- 99% uptime
- Core Web Vitals in green
- Bundle size optimization

### User Experience
- Low error rates (< 0.1%)
- Fast time to interactive
- Smooth navigation
- Mobile responsiveness

### Security
- No security vulnerabilities
- Proper SSL configuration
- Security headers implemented
- Rate limiting working

### Business
- User engagement metrics
- Conversion rates
- Feature usage analytics
- Performance impact on business goals

---

For additional support or questions, please refer to the project documentation or contact the development team.