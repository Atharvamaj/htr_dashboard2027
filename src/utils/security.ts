import DOMPurify from 'dompurify';
import { secureStorage } from './secureStorage';
import { logger } from "@/utils/logger";

// Environment configuration
export const config = {
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
  sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '3600', 10) * 1000,
  maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5', 10),
  rateLimitRequests: parseInt(import.meta.env.VITE_RATE_LIMIT_REQUESTS || '100', 10),
  rateLimitWindow: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW || '60', 10) * 1000,
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10),
  maxRetryAttempts: parseInt(import.meta.env.VITE_MAX_RETRY_ATTEMPTS || '3', 10),
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
  });
};

// Rate limiting utility
// WARNING: This is CLIENT-SIDE ONLY rate limiting for UX purposes.
// It CAN be bypassed by clearing localStorage, using different browsers, or disabling JavaScript.
// For production security, you MUST implement server-side rate limiting using:
// - Cloudflare Rate Limiting (recommended for Cloudflare Pages)
// - Supabase Edge Functions with rate limiting
// - API Gateway rate limiting
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(identifier: string, limit: number = config.rateLimitRequests, window: number = config.rateLimitWindow): boolean {
    const now = Date.now();
    const windowStart = now - window;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Filter out requests outside the window
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      secureLogger.warn('Client-side rate limit exceeded', { identifier, limit, window });
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string, limit: number = config.rateLimitRequests): number {
    const requests = this.requests.get(identifier) || [];
    return Math.max(0, limit - requests.length);
  }
}

export const rateLimiter = new RateLimiter();

// Session management with encrypted storage
// NOTE: While encrypted, sessions should ideally use httpOnly cookies for maximum security
export const sessionManager = {
  setSession: (token: string, expiresAt?: Date) => {
    const session = {
      token,
      expiresAt: expiresAt?.toISOString() || new Date(Date.now() + config.sessionTimeout).toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    try {
      // Use encrypted storage for session data
      secureStorage.setItem('session', session);
    } catch (error) {
      secureLogger.error('Failed to store session', error);
    }
  },

  getSession: () => {
    try {
      // Retrieve from encrypted storage
      const session = secureStorage.getItem('session');
      if (!session) return null;
      
      const expiresAt = new Date(session.expiresAt);
      
      if (expiresAt < new Date()) {
        sessionManager.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      secureLogger.error('Failed to retrieve session', error);
      sessionManager.clearSession();
      return null;
    }
  },

  clearSession: () => {
    try {
      secureStorage.removeItem('session');
    } catch (error) {
      secureLogger.error('Failed to clear session', error);
    }
  },

  isSessionValid: () => {
    const session = sessionManager.getSession();
    return session !== null;
  },
};

// Login attempt tracking with encrypted storage
export const loginAttemptTracker = {
  getAttempts: (identifier: string): number => {
    try {
      const data = secureStorage.getItem(`login_attempts_${identifier}`);
      return data ? data.count : 0;
    } catch {
      return 0;
    }
  },

  incrementAttempts: (identifier: string): number => {
    const current = loginAttemptTracker.getAttempts(identifier);
    const newCount = current + 1;
    
    try {
      secureStorage.setItem(`login_attempts_${identifier}`, {
        count: newCount,
        timestamp: Date.now(),
      });
      
      // Set expiration for attempts (reset after 15 minutes)
      setTimeout(() => {
        loginAttemptTracker.clearAttempts(identifier);
      }, 15 * 60 * 1000);
    } catch (error) {
      secureLogger.error('Failed to store login attempts', { identifier, error });
    }
    
    return newCount;
  },

  clearAttempts: (identifier: string): void => {
    try {
      secureStorage.removeItem(`login_attempts_${identifier}`);
    } catch (error) {
      secureLogger.error('Failed to clear login attempts', { identifier, error });
    }
  },

  isBlocked: (identifier: string): boolean => {
    return loginAttemptTracker.getAttempts(identifier) >= config.maxLoginAttempts;
  },
};

// Content Security Policy helpers
export const cspHelpers = {
  generateNonce: (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  isAllowedOrigin: (origin: string): boolean => {
    const allowedOrigins = [
      window.location.origin,
      'https://*.supabase.co',
      'https://*.supabase.io',
    ];
    
    return allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '[^.]*');
        const regex = new RegExp(pattern);
        return regex.test(origin);
      }
      return allowed === origin;
    });
  },
};

// Secure logging (remove sensitive data and prevent production logging)
export const secureLogger = {
  log: (message: string, data?: any) => {
    // Only log in development mode when debug logs are enabled
    if (!config.isDevelopment || !config.enableDebugLogs) return;
    
    const sanitizedData = data ? secureLogger.sanitizeLogData(data) : undefined;
    logger.log(message, sanitizedData);
  },

  warn: (message: string, data?: any) => {
    // Warnings shown in development only
    if (!config.isDevelopment) return;
    
    const sanitizedData = data ? secureLogger.sanitizeLogData(data) : undefined;
    logger.warn(message, sanitizedData);
  },

  error: (message: string, error?: any) => {
    // Errors are always logged but sanitized
    const sanitizedError = error ? secureLogger.sanitizeLogData(error) : undefined;
    logger.error(message, sanitizedError);
  },

  info: (message: string, data?: any) => {
    // Info logs only in development
    if (!config.isDevelopment) return;
    
    const sanitizedData = data ? secureLogger.sanitizeLogData(data) : undefined;
    logger.info(message, sanitizedData);
  },

  sanitizeLogData: (data: any): any => {
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'authorization',
      'email', 'phone', 'ssn', 'credit_card', 'session',
      'api_key', 'access_token', 'refresh_token', 'bearer'
    ];
    
    if (typeof data === 'string') {
      return sensitiveFields.some(field => data.toLowerCase().includes(field)) ? '[REDACTED]' : data;
    }
    
    if (typeof data === 'object' && data !== null) {
      // Handle arrays
      if (Array.isArray(data)) {
        return data.map(item => secureLogger.sanitizeLogData(item));
      }
      
      const sanitized = { ...data };
      
      for (const key of Object.keys(sanitized)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = secureLogger.sanitizeLogData(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return data;
  },
};

// Security headers validation
export const validateSecurityHeaders = async (): Promise<void> => {
  if (!config.isProduction) return;
  
  try {
    const response = await fetch(window.location.origin, { method: 'HEAD' });
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
    ];
    
    const missingHeaders = requiredHeaders.filter(header => !headers.get(header));
    
    if (missingHeaders.length > 0) {
      logger.warn('Missing security headers:', missingHeaders);
    }
  } catch (error) {
    logger.warn('Could not validate security headers:', error);
  }
};