# Server-Side Rate Limiting Guide

## ⚠️ CRITICAL: Client-Side Rate Limiting is NOT Secure

The rate limiting implemented in `src/utils/security.ts` is **CLIENT-SIDE ONLY** and provides **NO REAL SECURITY**. It can be easily bypassed by:

- Clearing browser localStorage
- Using a different browser or incognito mode
- Disabling JavaScript
- Making direct API calls bypassing the frontend

**This client-side rate limiting should ONLY be used for improving user experience, NOT for security.**

---

## Recommended Server-Side Rate Limiting Solutions

### Option 1: Cloudflare Rate Limiting (RECOMMENDED for Cloudflare Pages)

Cloudflare provides built-in rate limiting at the edge, which is the most effective solution for your deployment.

#### Setup Steps:

1. **Go to Cloudflare Dashboard** → Your Domain → Security → WAF

2. **Create Rate Limiting Rule:**

```
Rule Name: API Rate Limit
When incoming requests match:
  - URI Path contains "/api/"
  
Then:
  - Rate limit with:
    - Requests: 100 per 1 minute
    - Action: Block
    - Duration: 1 hour
```

3. **Create Auth Rate Limiting Rule:**

```
Rule Name: Auth Endpoint Protection
When incoming requests match:
  - URI Path contains "/auth"
  - Method equals POST
  
Then:
  - Rate limit with:
    - Requests: 5 per 15 minutes
    - Action: Challenge
    - Duration: 15 minutes
```

#### Advanced Configuration:

```javascript
// Custom rate limiting expression
(http.request.uri.path contains "/api/login") and 
(ip.src ne 10.0.0.0/8) and 
(cf.threat_score gt 10)
```

---

### Option 2: Supabase Edge Functions

Implement rate limiting directly in Supabase Edge Functions using Upstash Redis.

#### Setup:

1. **Install Upstash Redis:**
```bash
npm install @upstash/redis
```

2. **Create Edge Function with Rate Limiting:**

```typescript
// supabase/functions/protected-endpoint/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Redis } from 'https://esm.sh/@upstash/redis@1.20.1'

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_TOKEN')!,
})

async function rateLimit(identifier: string, limit: number = 100, window: number = 60) {
  const key = `rate_limit:${identifier}`
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.expire(key, window)
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt: Date.now() + (window * 1000)
  }
}

serve(async (req) => {
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimitResult = await rateLimit(clientIP, 100, 60)
  
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }), 
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          'Retry-After': '60'
        }
      }
    )
  }
  
  // Your actual endpoint logic here
  return new Response(
    JSON.stringify({ success: true }), 
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      }
    }
  )
})
```

3. **Deploy Edge Function:**
```bash
supabase functions deploy protected-endpoint
```

---

### Option 3: Supabase Database-Level Rate Limiting

Use PostgreSQL and triggers for rate limiting.

#### Setup:

```sql
-- Create rate limiting table
CREATE TABLE rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_identifier_endpoint 
ON rate_limits(identifier, endpoint, window_start);

-- Create function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Clean old records
  DELETE FROM rate_limits 
  WHERE window_start < v_window_start;
  
  -- Get current count
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- Check if limit exceeded
  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    window_start = CASE 
      WHEN rate_limits.window_start < v_window_start 
      THEN NOW() 
      ELSE rate_limits.window_start 
    END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create policy to check rate limits
CREATE POLICY "Rate limit policy" ON your_table
  USING (check_rate_limit(auth.uid()::TEXT, 'your_endpoint', 100, 60));
```

---

## Testing Rate Limiting

### Test with curl:

```bash
# Test rate limiting
for i in {1..110}; do
  curl -X POST https://your-domain.com/api/endpoint \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}' \
    -w "\nStatus: %{http_code}\n"
done
```

### Test with Apache Bench:

```bash
# 200 requests with 10 concurrent connections
ab -n 200 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/endpoint
```

---

## Rate Limiting Best Practices

### 1. Different Limits for Different Endpoints

```
- Login/Auth: 5 requests per 15 minutes per IP
- API Reads: 100 requests per minute per user
- API Writes: 50 requests per minute per user
- Public Endpoints: 20 requests per minute per IP
- Admin Endpoints: Separate, higher limits
```

### 2. Use Multiple Identifiers

Combine multiple identifiers for more sophisticated rate limiting:

```typescript
// Rate limit by: IP + User ID + Endpoint
const identifier = `${clientIP}:${userId}:${endpoint}`
```

### 3. Whitelist Trusted IPs

```typescript
const WHITELISTED_IPS = [
  '10.0.0.0/8',     // Internal network
  '192.168.0.0/16',  // Private network
];

if (isWhitelisted(clientIP)) {
  return { allowed: true };
}
```

### 4. Progressive Penalties

```typescript
// Increase block duration for repeat offenders
const blockDurations = [
  60,      // 1 minute (first offense)
  300,     // 5 minutes (second)
  3600,    // 1 hour (third)
  86400,   // 24 hours (fourth+)
];
```

### 5. Return Proper Headers

Always include these headers in rate-limited responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1699564800
Retry-After: 60
```

---

## Monitoring and Alerts

### Set Up Alerts:

1. **Cloudflare Dashboard:**
   - Notifications → Add Notification
   - Choose "Rate Limiting" alerts
   - Set threshold (e.g., > 1000 blocked requests/hour)

2. **Supabase:**
   - Monitor Edge Function logs
   - Set up log-based alerts in your observability platform

### Key Metrics to Monitor:

- Rate limit hits per hour
- Blocked IP addresses
- False positive rate (legitimate users blocked)
- Attack patterns (distributed vs single-source)

---

## Integration with Frontend

Update your API client to handle rate limiting:

```typescript
// src/lib/api-client.ts
import { secureLogger } from '@/utils/security';

export async function apiRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const resetAt = response.headers.get('X-RateLimit-Reset');
      
      secureLogger.warn('Rate limit exceeded', {
        url,
        retryAfter,
        resetAt,
      });
      
      throw new Error(
        `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
      );
    }
    
    // Log remaining rate limit for monitoring
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining && parseInt(remaining) < 10) {
      secureLogger.warn('Approaching rate limit', {
        url,
        remaining,
      });
    }
    
    return response;
  } catch (error) {
    secureLogger.error('API request failed', error);
    throw error;
  }
}
```

---

## Next Steps

1. **Choose your rate limiting solution** (Cloudflare recommended)
2. **Implement server-side rate limiting**
3. **Test thoroughly** with various attack scenarios
4. **Monitor** rate limit hits and adjust thresholds
5. **Remove or clearly mark** client-side rate limiting as UX-only

Remember: **Security measures must be implemented server-side. Client-side code is never secure.**
