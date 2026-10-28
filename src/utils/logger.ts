/**
 * Production-Safe Logger Utility
 * 
 * This logger ensures that sensitive information is never logged in production.
 * All console.log statements are gated by environment checks.
 * 
 * In production:
 * - log() and info() are completely silent
 * - warn() and error() still work for critical issues
 * - debug() is always silent
 * 
 * Usage:
 * import { logger } from '@/utils/logger';
 * logger.log('Development only message');
 * logger.error('This will show in production');
 */

const isDevelopment = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test';

// Allow logging in development and test environments only
const shouldLog = isDevelopment || isTest;

/**
 * Production-safe logger
 */
export const logger = {
  /**
   * Log informational messages (development only)
   */
  log: (...args: any[]): void => {
    if (shouldLog) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages (development only)
   */
  info: (...args: any[]): void => {
    if (shouldLog) {
      console.info(...args);
    }
  },

  /**
   * Log warnings (production safe - still shows in production)
   */
  warn: (...args: any[]): void => {
    console.warn(...args);
  },

  /**
   * Log errors (production safe - always shows)
   */
  error: (...args: any[]): void => {
    console.error(...args);
  },

  /**
   * Log debug messages (never shows, even in development)
   * Use this for verbose debugging that you don't want to see normally
   */
  debug: (...args: any[]): void => {
    if (import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true') {
      console.debug(...args);
    }
  },

  /**
   * Log a table (development only)
   */
  table: (data: any): void => {
    if (shouldLog && console.table) {
      console.table(data);
    }
  },

  /**
   * Group console messages (development only)
   */
  group: (label: string): void => {
    if (shouldLog && console.group) {
      console.group(label);
    }
  },

  /**
   * End console group (development only)
   */
  groupEnd: (): void => {
    if (shouldLog && console.groupEnd) {
      console.groupEnd();
    }
  },

  /**
   * Time operations (development only)
   */
  time: (label: string): void => {
    if (shouldLog && console.time) {
      console.time(label);
    }
  },

  /**
   * End timing operations (development only)
   */
  timeEnd: (label: string): void => {
    if (shouldLog && console.timeEnd) {
      console.timeEnd(label);
    }
  },
};

/**
 * No-op logger that does nothing
 * Use this when you want to completely silence all logging
 */
export const silentLogger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  table: () => {},
  group: () => {},
  groupEnd: () => {},
  time: () => {},
  timeEnd: () => {},
};

/**
 * Export as default for convenience
 */
export default logger;
