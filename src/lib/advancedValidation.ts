/**
 * Advanced Input Validation
 * 
 * Provides comprehensive security validation for user inputs including:
 * - XSS attack detection
 * - SQL injection prevention
 * - Path traversal detection
 * - Command injection prevention
 * - LDAP injection detection
 * - NoSQL injection prevention
 * - Enhanced sanitization
 */

import { z } from 'zod';
import DOMPurify from 'dompurify';
import { secureLogger } from '@/utils/security';

/**
 * Security threat patterns
 */
const SECURITY_PATTERNS = {
  // XSS patterns
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
  ],
  
  // SQL injection patterns
  sql: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE)\b)/gi,
    /(--|#|\/\*|\*\/)/g, // SQL comments
    /('|"|`)(.*?)(\1)/g, // Quoted strings
    /;\s*\w+/g, // Semicolon followed by command
    /\b(OR|AND)\b.*?=/gi, // Boolean conditions
    /\bEXEC\b.*?\(/gi,
    /\bEXECUTE\b.*?\(/gi,
  ],
  
  // Path traversal
  pathTraversal: [
    /\.\.[\/\\]/g, // ../ or ..\
    /%2e%2e[\/\\]/gi, // URL encoded ../
    /\.\.%2f/gi,
    /\.\.%5c/gi,
  ],
  
  // Command injection
  commandInjection: [
    /[;&|`$\(\)]/g, // Shell metacharacters
    /\$\{.*?\}/g, // Variable expansion
    /`.*?`/g, // Backticks
    /\$\(.*?\)/g, // Command substitution
  ],
  
  // LDAP injection
  ldap: [
    /[*()\\]/g,
    /\|\|/g,
    /&&/g,
  ],
  
  // NoSQL injection
  nosql: [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$regex/gi,
    /\{\s*\$.*?\}/g,
  ],
  
  // Common malicious patterns
  malicious: [
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /new\s+Function/gi,
  ],
};

/**
 * Security threat detection result
 */
export interface SecurityThreat {
  isValid: boolean;
  threats: string[];
  sanitized: string;
}

/**
 * Detect security threats in input
 */
export function detectSecurityThreats(input: string): SecurityThreat {
  const threats: string[] = [];
  
  // Check for XSS
  if (SECURITY_PATTERNS.xss.some(pattern => pattern.test(input))) {
    threats.push('Potential XSS attack detected');
  }
  
  // Check for SQL injection
  if (SECURITY_PATTERNS.sql.some(pattern => pattern.test(input))) {
    threats.push('Potential SQL injection detected');
  }
  
  // Check for path traversal
  if (SECURITY_PATTERNS.pathTraversal.some(pattern => pattern.test(input))) {
    threats.push('Path traversal attempt detected');
  }
  
  // Check for command injection
  if (SECURITY_PATTERNS.commandInjection.some(pattern => pattern.test(input))) {
    threats.push('Command injection attempt detected');
  }
  
  // Check for LDAP injection
  if (SECURITY_PATTERNS.ldap.some(pattern => pattern.test(input))) {
    threats.push('Potential LDAP injection detected');
  }
  
  // Check for NoSQL injection
  if (SECURITY_PATTERNS.nosql.some(pattern => pattern.test(input))) {
    threats.push('Potential NoSQL injection detected');
  }
  
  // Check for malicious patterns
  if (SECURITY_PATTERNS.malicious.some(pattern => pattern.test(input))) {
    threats.push('Malicious code pattern detected');
  }
  
  // Log threats if found
  if (threats.length > 0) {
    secureLogger.warn('Security threats detected in input', {
      threatsCount: threats.length,
      threats,
      inputLength: input.length,
    });
  }
  
  return {
    isValid: threats.length === 0,
    threats,
    sanitized: sanitizeAdvanced(input),
  };
}

/**
 * Advanced sanitization
 */
export function sanitizeAdvanced(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Use DOMPurify for HTML sanitization
  sanitized = DOMPurify.sanitize(sanitized, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  // Remove potentially dangerous Unicode characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters
  sanitized = sanitized.replace(/[\u202E]/g, ''); // Right-to-left override
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Trim
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validate email with additional security checks
 */
export function validateSecureEmail(email: string): { valid: boolean; reason?: string } {
  // Basic format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  
  // Check for suspicious patterns
  if (email.includes('..')) {
    return { valid: false, reason: 'Email contains consecutive dots' };
  }
  
  if (email.startsWith('.') || email.endsWith('.')) {
    return { valid: false, reason: 'Email starts or ends with dot' };
  }
  
  // Check length limits (per RFC 5321)
  const [localPart, domain] = email.split('@');
  if (localPart.length > 64 || domain.length > 255 || email.length > 254) {
    return { valid: false, reason: 'Email exceeds length limits' };
  }
  
  // Check for suspicious TLDs or domains
  const suspiciousTLDs = ['tk', 'ml', 'ga', 'cf', 'gq']; // Common spam TLDs
  const tld = domain.split('.').pop()?.toLowerCase();
  if (tld && suspiciousTLDs.includes(tld)) {
    secureLogger.warn('Email with suspicious TLD', { tld });
  }
  
  return { valid: true };
}

/**
 * Validate URL with security checks
 */
export function validateSecureUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Only HTTP/HTTPS URLs are allowed' };
    }
    
    // Check for suspicious patterns in the URL
    if (detectSecurityThreats(url).threats.length > 0) {
      return { valid: false, reason: 'URL contains suspicious patterns' };
    }
    
    // Check for IP addresses (potentially suspicious)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
      secureLogger.warn('URL uses IP address instead of domain', { hostname: parsed.hostname });
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Enhanced Zod validators with security checks
 */

/**
 * Secure string validator
 */
export const secureString = (options: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  allowEmpty?: boolean;
}) => {
  let validator = z.string();
  
  if (!options.allowEmpty) {
    validator = validator.min(1, 'Field cannot be empty');
  }
  
  if (options.minLength) {
    validator = validator.min(options.minLength, `Must be at least ${options.minLength} characters`);
  }
  
  if (options.maxLength) {
    validator = validator.max(options.maxLength, `Must be less than ${options.maxLength} characters`);
  }
  
  if (options.pattern) {
    validator = validator.regex(options.pattern, options.patternMessage || 'Invalid format');
  }
  
  // Add security validation
  return validator.refine(
    (val) => {
      const threats = detectSecurityThreats(val);
      return threats.isValid;
    },
    {
      message: 'Input contains potentially malicious content',
    }
  );
};

/**
 * Secure email validator
 */
export const secureEmail = () => {
  return z.string()
    .email('Invalid email address')
    .max(254, 'Email address too long')
    .refine(
      (val) => validateSecureEmail(val).valid,
      (val) => ({ message: validateSecureEmail(val).reason || 'Invalid email' })
    );
};

/**
 * Secure name validator (for user names, school names, etc.)
 */
export const secureName = (options: { minLength?: number; maxLength?: number } = {}) => {
  return secureString({
    minLength: options.minLength || 2,
    maxLength: options.maxLength || 100,
    pattern: /^[a-zA-Z0-9\s\-'&.]+$/,
    patternMessage: 'Name contains invalid characters',
  });
};

/**
 * Secure text area validator (for comments, descriptions, etc.)
 */
export const secureTextArea = (maxLength: number = 1000) => {
  return z.string()
    .max(maxLength, `Must be less than ${maxLength} characters`)
    .refine(
      (val) => {
        const threats = detectSecurityThreats(val);
        return threats.isValid;
      },
      {
        message: 'Input contains potentially malicious content',
      }
    )
    .transform((val) => sanitizeAdvanced(val));
};

/**
 * Validate and sanitize object deeply
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeAdvanced(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => 
        typeof item === 'string' ? sanitizeAdvanced(item) : 
        typeof item === 'object' && item !== null ? sanitizeObject(item) : 
        item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}

/**
 * Schema builder with automatic security validation
 */
export class SecureSchemaBuilder {
  /**
   * Create a registration form schema with enhanced security
   */
  static registrationSchema() {
    return z.object({
      full_name: secureName({ minLength: 2, maxLength: 50 }),
      email: secureEmail(),
      school_name: secureName({ minLength: 2, maxLength: 100 }),
      grade: z.enum(['9', '10', '11', '12', 'University/College']),
      hackathons_attended: z.number()
        .int('Must be a whole number')
        .min(0, 'Cannot be negative')
        .max(50, 'Value seems unrealistic'),
      dietary_restrictions: secureTextArea(500),
      team_name: secureString({
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9\s\-_]+$/,
        patternMessage: 'Team name can only contain letters, numbers, spaces, hyphens, and underscores',
        allowEmpty: true,
      }).optional(),
    });
  }
  
  /**
   * Create a team invite schema with enhanced security
   */
  static teamInviteSchema() {
    return z.object({
      emails: z.array(secureEmail())
        .min(1, 'At least one email is required')
        .max(3, 'Cannot invite more than 3 members'),
    });
  }
  
  /**
   * Create a comment/feedback schema
   */
  static commentSchema() {
    return z.object({
      comment: secureTextArea(1000)
        .min(1, 'Comment cannot be empty')
        .max(1000, 'Comment is too long'),
    });
  }
}

/**
 * Middleware-style validator
 */
export async function validateWithSecurity<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    // First sanitize if it's an object
    let sanitizedData = data;
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      sanitizedData = sanitizeObject(data as Record<string, any>);
    }
    
    // Then validate
    const validatedData = await schema.parseAsync(sanitizedData);
    
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });
      
      secureLogger.warn('Validation failed', { errors });
      
      return { success: false, errors };
    }
    
    secureLogger.error('Unexpected validation error', error);
    return { success: false, errors: ['Validation failed'] };
  }
}

/**
 * Export everything
 */
export {
  secureString,
  secureEmail,
  secureName,
  secureTextArea,
  sanitizeAdvanced,
  detectSecurityThreats,
  validateSecureEmail,
  validateSecureUrl,
  sanitizeObject,
  SecureSchemaBuilder,
  validateWithSecurity,
};
