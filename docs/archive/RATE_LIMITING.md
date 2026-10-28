# Server-Side Rate Limiting Configuration

This document provides guidance on implementing server-side rate limiting for the HTR Dashboard to complement the existing client-side protections.

## 🚨 Important: Client-Side Only Warning

**Current Status**: The application currently only implements client-side rate limiting, which can be bypassed by disabling JavaScript or making direct API calls.

**Risk Level**: Medium - Attackers could bypass rate limits by:
- Disabling JavaScript in browser
- Making direct API calls to Supabase
- Using automated tools

## 🛡️ Recommended Solutions

### Option 1: Cloudflare Pages Rate Limiting (Recommended)

If deploying to Cloudflare Pages, enable rate limiting via the dashboard:

#### 1. Enable Cloudflare WAF
```bash
# In Cloudflare Dashboard:
Security → WAF → Rate Limiting Rules
```

#### 2. Create Rate Limiting Rules
```javascript
// Example rate limiting rule for authentication endpoints
{
  "action": "challenge",
  "expression": "(http.request.uri.path contains \"/auth\" and http.request.method eq \"POST\")",
  "ratelimit": {
    "requests_per_minute": 5,
    "window": 60
  }
}
```

#### 3. Configure in `_headers` file
```bash
# Add to public/_headers
/auth/*
  X-RateLimit-Limit: 5
  X-RateLimit-Window: 60
```

### Option 2: Supabase Edge Functions

Create Edge Functions for rate limiting:

#### 1. Create Edge Function
```typescript
// supabase/functions/rate-limit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

serve(async (req) => {
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  
  // Clean expired entries
  for (const [key, value] of rateLimitStore) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
  
  const record = rateLimitStore.get(clientIP)
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs })
    return new Response(JSON.stringify({ allowed: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  if (record.count >= maxAttempts) {
    return new Response(JSON.stringify({ 
      allowed: false, 
      resetTime: record.resetTime 
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  record.count++
  return new Response(JSON.stringify({ allowed: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

#### 2. Deploy Edge Function
```bash
supabase functions deploy rate-limit
```

#### 3. Use in Application
```typescript
// src/lib/server-rate-limit.ts
export async function checkServerRateLimit(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch('/api/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    })
    
    const data = await response.json()
    return data.allowed
  } catch (error) {
    console.warn('Server rate limit check failed, allowing request')
    return true // Fail open for availability
  }
}
```

### Option 3: Vercel Edge Functions

If using Vercel, create Edge Functions:

#### 1. Create Edge Function
```typescript
// api/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server'

const rateLimitStore = new Map()

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown'
  const now = Date.now()
  
  // Rate limiting logic here
  
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*']
}
```

## 🔧 Implementation Steps

### Immediate (High Priority)
1. **Choose deployment platform** (Cloudflare Pages recommended)
2. **Configure WAF rules** for authentication endpoints
3. **Set up monitoring** for rate limit violations

### Short Term (Next Sprint)
1. **Implement Edge Functions** for custom rate limiting
2. **Add rate limit headers** to responses
3. **Create alerting** for abuse patterns

### Long Term (Next Quarter)
1. **Advanced bot detection** 
2. **Geolocation-based limiting**
3. **Machine learning abuse detection**

## 📊 Recommended Rate Limits

### Authentication Endpoints
- **Login attempts**: 5 per 15 minutes per IP
- **OTP requests**: 3 per 5 minutes per email
- **Password reset**: 3 per hour per email

### API Endpoints
- **Registration**: 2 per hour per IP
- **Profile updates**: 10 per minute per user
- **Search queries**: 30 per minute per user

### Admin Endpoints
- **User management**: 50 per minute per admin
- **Bulk operations**: 10 per minute per admin

## 🚨 Monitoring & Alerting

### Metrics to Track
- Rate limit violations per hour
- Top violating IP addresses
- Blocked request patterns
- False positive rates

### Alert Conditions
```yaml
# Example alert configuration
alerts:
  - name: "High Rate Limit Violations"
    condition: "rate_limit_violations > 100/hour"
    action: "notify_security_team"
  
  - name: "Authentication Brute Force"
    condition: "auth_failures > 50/5min from same_ip"
    action: "temporary_ip_ban"
```

## 🔍 Testing Rate Limits

### Manual Testing
```bash
# Test authentication rate limiting
for i in {1..10}; do
  curl -X POST https://your-domain.com/auth \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done
```

### Automated Testing
```typescript
// tests/rate-limiting.test.ts
describe('Rate Limiting', () => {
  it('should block after max attempts', async () => {
    const responses = await Promise.all([
      // Make 6 requests simultaneously
      ...Array(6).fill(null).map(() => 
        fetch('/auth', { method: 'POST' })
      )
    ])
    
    const blocked = responses.filter(r => r.status === 429)
    expect(blocked.length).toBeGreaterThan(0)
  })
})
```

## 📚 Additional Resources

- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OWASP Rate Limiting Guide](https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html)

## 🔄 Next Steps

1. **Choose implementation method** based on deployment platform
2. **Configure basic rate limiting** for authentication
3. **Test thoroughly** in staging environment
4. **Monitor in production** and adjust limits as needed
5. **Document incidents** and improve rules over time

---

**Security Note**: Server-side rate limiting is crucial for production applications. The current client-side implementation should be considered a temporary measure while server-side protections are implemented.

**Priority**: HIGH - Should be implemented before production deployment with 500+ users.