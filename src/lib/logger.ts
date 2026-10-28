/**
 * Secure Logger Utility
 * Automatically disables logging in production and sanitizes sensitive data
 */

const isDevelopment = import.meta.env.MODE === 'development';
const enableDebugLogs = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'auth',
  'bearer',
  'cookie',
  'session',
  'credentials',
  'private_key',
  'access_token',
  'refresh_token',
];

/**
 * Sanitizes data by removing or redacting sensitive information
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle strings
  if (typeof data === 'string') {
    // Check if string contains sensitive keywords
    const lowerData = data.toLowerCase();
    for (const field of SENSITIVE_FIELDS) {
      if (lowerData.includes(field)) {
        return '[REDACTED]';
      }
    }
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key is sensitive
      const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Logger class with automatic production protection
 */
class SecureLogger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  /**
   * Log general information (only in development)
   */
  log(message: string, ...args: any[]): void {
    if (!isDevelopment && !enableDebugLogs) return;

    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    const prefixedMessage = this.prefix ? `[${this.prefix}] ${message}` : message;
    
    // eslint-disable-next-line no-console
    console.log(prefixedMessage, ...sanitizedArgs);
  }

  /**
   * Log warnings (always enabled but sanitized)
   */
  warn(message: string, ...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    const prefixedMessage = this.prefix ? `[${this.prefix}] ${message}` : message;
    
    // eslint-disable-next-line no-console
    console.warn(prefixedMessage, ...sanitizedArgs);
  }

  /**
   * Log errors (always enabled but sanitized)
   */
  error(message: string, ...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    const prefixedMessage = this.prefix ? `[${this.prefix}] ${message}` : message;
    
    // eslint-disable-next-line no-console
    console.error(prefixedMessage, ...sanitizedArgs);
  }

  /**
   * Log debug information (only in development with debug flag)
   */
  debug(message: string, ...args: any[]): void {
    if (!enableDebugLogs) return;

    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    const prefixedMessage = this.prefix ? `[${this.prefix}] ${message}` : message;
    
    // eslint-disable-next-line no-console
    console.debug(prefixedMessage, ...sanitizedArgs);
  }

  /**
   * Log info (only in development)
   */
  info(message: string, ...args: any[]): void {
    if (!isDevelopment && !enableDebugLogs) return;

    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    const prefixedMessage = this.prefix ? `[${this.prefix}] ${message}` : message;
    
    // eslint-disable-next-line no-console
    console.info(prefixedMessage, ...sanitizedArgs);
  }

  /**
   * Create a child logger with additional prefix
   */
  child(childPrefix: string): SecureLogger {
    const newPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
    return new SecureLogger(newPrefix);
  }
}

/**
 * Default logger instance
 */
export const logger = new SecureLogger();

/**
 * Create a logger with a specific prefix
 */
export function createLogger(prefix: string): SecureLogger {
  return new SecureLogger(prefix);
}

/**
 * Export for testing purposes
 */
export { sanitizeData };
