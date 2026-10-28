import { z } from 'zod';
import { logger } from "@/utils/logger";

// Enhanced security validation patterns
const SECURITY_PATTERNS = {
  // Path traversal attempts
  pathTraversal: /\.\.[/\\]|\.\.\.%2[fF]|\.\.\.%5[cC]/,
  
  // Template injection attempts  
  templateInjection: /\{\{.*\}\}|\$\{.*\}|<%.*%>/,
  
  // LDAP/JNDI injection
  ldapInjection: /\$\{jndi:|ldap:|rmi:|dns:/i,
  
  // NoSQL injection
  nosqlInjection: /\$where|\$ne|\$gt|\$lt|\$regex|\$or|\$and/i,
  
  // Command injection
  commandInjection: /[;&|`$(){}[\]]/,
  
  // Advanced XSS patterns
  advancedXSS: /javascript:|vbscript:|onload=|onerror=|onmouseover=|onclick=/i
};

// Enhanced input sanitizer
export const sanitizeInputAdvanced = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;
  
  // Remove null bytes and control characters (excluding common whitespace)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Remove path traversal attempts
  sanitized = sanitized.replace(SECURITY_PATTERNS.pathTraversal, '');
  
  // Remove template injection patterns
  sanitized = sanitized.replace(SECURITY_PATTERNS.templateInjection, '');
  
  // Remove LDAP injection attempts
  sanitized = sanitized.replace(SECURITY_PATTERNS.ldapInjection, '');
  
  // Trim whitespace and limit length
  sanitized = sanitized.trim().slice(0, 1000);
  
  return sanitized;
};

// Security validation function
export const validateSecurityThreats = (input: string): { 
  isValid: boolean; 
  threats: string[]; 
  sanitized: string; 
} => {
  const threats: string[] = [];
  
  // Check for various attack patterns
  if (SECURITY_PATTERNS.pathTraversal.test(input)) {
    threats.push('Path Traversal');
  }
  
  if (SECURITY_PATTERNS.templateInjection.test(input)) {
    threats.push('Template Injection');
  }
  
  if (SECURITY_PATTERNS.ldapInjection.test(input)) {
    threats.push('LDAP/JNDI Injection');
  }
  
  if (SECURITY_PATTERNS.nosqlInjection.test(input)) {
    threats.push('NoSQL Injection');
  }
  
  if (SECURITY_PATTERNS.commandInjection.test(input)) {
    threats.push('Command Injection');
  }
  
  if (SECURITY_PATTERNS.advancedXSS.test(input)) {
    threats.push('Advanced XSS');
  }
  
  // Basic checks
  if (input.includes('<script>')) {
    threats.push('Script Injection');
  }
  
  if (input.includes('DROP TABLE')) {
    threats.push('SQL Injection');
  }
  
  if (input.length > 1000) {
    threats.push('Buffer Overflow Attempt');
  }

  const sanitized = sanitizeInputAdvanced(input);
  
  return {
    isValid: threats.length === 0,
    threats,
    sanitized
  };
};

// Enhanced schema with security validation
export const secureStringSchema = (fieldName: string, maxLength = 100) =>
  z.string()
    .max(maxLength, `${fieldName} too long`)
    .refine((val) => {
      const security = validateSecurityThreats(val);
      return security.isValid;
    }, (val) => ({
      message: `${fieldName} contains potentially malicious content: ${
        validateSecurityThreats(val).threats.join(', ')
      }`
    }))
    .transform((val) => sanitizeInputAdvanced(val));

// Rate limiting with more sophisticated tracking
export class AdvancedRateLimiter {
  private attempts: Map<string, {
    count: number;
    resetTime: number;
    violations: string[];
  }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000,
    private banDuration: number = 60 * 60 * 1000 // 1 hour ban
  ) {}
  
  isAllowed(key: string, violationType?: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    banned: boolean;
  } {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    // Check if banned
    if (record && record.violations.length >= 3) {
      const lastViolation = Math.max(...record.violations.map(v => parseInt(v)));
      if (now < lastViolation + this.banDuration) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: lastViolation + this.banDuration,
          banned: true
        };
      }
    }
    
    if (!record || now > record.resetTime) {
      const newRecord = {
        count: 1,
        resetTime: now + this.windowMs,
        violations: record?.violations || []
      };
      this.attempts.set(key, newRecord);
      
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetTime: newRecord.resetTime,
        banned: false
      };
    }
    
    if (record.count >= this.maxAttempts) {
      if (violationType) {
        record.violations.push(`${now}:${violationType}`);
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        banned: false
      };
    }
    
    record.count++;
    
    return {
      allowed: true,
      remaining: this.maxAttempts - record.count,
      resetTime: record.resetTime,
      banned: false
    };
  }
}

// Security event logger
export class SecurityLogger {
  static logSecurityEvent(event: {
    type: 'threat_detected' | 'rate_limit_exceeded' | 'auth_failure' | 'admin_access';
    userId?: string;
    ip?: string;
    userAgent?: string;
    details: any;
  }) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event
    };
    
    // In production, you might want to send this to a logging service
    logger.warn('🚨 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
    
    // Store in localStorage for development (in production, use proper logging)
    const existingLogs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
    existingLogs.push(logEntry);
    
    // Keep only last 100 entries
    const recentLogs = existingLogs.slice(-100);
    localStorage.setItem('securityLogs', JSON.stringify(recentLogs));
  }
  
  static getSecurityLogs(): any[] {
    return JSON.parse(localStorage.getItem('securityLogs') || '[]');
  }
}