import { z } from 'zod';
import DOMPurify from 'dompurify';

// Input validation schemas
export const userInputSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email address too long'),
  
  school_name: z.string()
    .min(2, 'School name must be at least 2 characters')
    .max(100, 'School name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-'&.]+$/, 'School name contains invalid characters'),
  
  grade: z.string()
    .regex(/^(9|10|11|12|University\/College)$/, 'Invalid grade selection'),
  
  hackathons_attended: z.number()
    .min(0, 'Cannot be negative')
    .max(50, 'Value seems unrealistic'),
  
  dietary_restrictions: z.string()
    .max(500, 'Dietary restrictions description too long'),
  
  team_name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(30, 'Team name must be less than 30 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Team name can only contain letters, numbers, spaces, hyphens, and underscores'),
});

export const teamInviteSchema = z.object({
  emails: z.array(z.string().email('Invalid email address'))
    .min(1, 'At least one email is required')
    .max(3, 'Cannot invite more than 3 members')
});

// Sanitization functions
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length as additional safety measure
  sanitized = sanitized.slice(0, 1000);
  
  return sanitized;
};

export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

// Rate limiting utilities
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (record.count >= this.maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    
    const now = Date.now();
    return Math.max(0, record.resetTime - now);
  }
}

// Security headers for API requests
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none';"
};

// Session timeout utilities
export class SessionManager {
  private static readonly SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
  private static readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
  
  static setLastActivity(): void {
    localStorage.setItem('lastActivity', Date.now().toString());
  }
  
  static getLastActivity(): number {
    const lastActivity = localStorage.getItem('lastActivity');
    return lastActivity ? parseInt(lastActivity) : Date.now();
  }
  
  static isSessionExpired(): boolean {
    const lastActivity = this.getLastActivity();
    return Date.now() - lastActivity > this.SESSION_TIMEOUT;
  }
  
  static shouldShowWarning(): boolean {
    const lastActivity = this.getLastActivity();
    const timeSinceActivity = Date.now() - lastActivity;
    return timeSinceActivity > (this.SESSION_TIMEOUT - this.WARNING_TIME);
  }
}

// Environment validation
export const validateEnvironment = (): void => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate URL format
  try {
    new URL(import.meta.env.VITE_SUPABASE_URL);
  } catch {
    throw new Error('Invalid VITE_SUPABASE_URL format');
  }
};

// SQL injection prevention helpers
export const escapeSqlString = (input: string): string => {
  return input.replace(/'/g, "''");
};

// XSS prevention helpers
export const escapeHtml = (input: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (s) => map[s]);
};

export const validateAndSanitizeFormData = <T extends Record<string, any>>(
  data: T,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; errors?: string[] } => {
  try {
    // First sanitize all string inputs
    const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = sanitizeInput(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as T);
    
    // Then validate with schema
    const validatedData = schema.parse(sanitizedData);
    
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      success: false,
      errors: ['Validation failed']
    };
  }
};