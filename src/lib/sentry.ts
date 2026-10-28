/**
 * Sentry Error Tracking Configuration
 * 
 * Provides centralized error tracking and monitoring for production.
 * Captures errors, performance metrics, and user feedback.
 */

import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import { logger } from "@/utils/logger";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

/**
 * Initialize Sentry
 * Should be called as early as possible in the application lifecycle
 */
export function initSentry() {
  const environment = import.meta.env.MODE;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Only initialize if DSN is provided
  if (!dsn) {
    logger.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }
  
  // Only enable in production or if explicitly enabled
  const enableSentry = environment === 'production' || 
                       import.meta.env.VITE_ENABLE_SENTRY === 'true';
  
  if (!enableSentry) {
    logger.info('Sentry disabled in development mode');
    return;
  }
  
  Sentry.init({
    // Your Sentry DSN
    dsn,
    
    // Environment
    environment,
    
    // Release version (for tracking which version caused errors)
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
      
      // React Router integration for better error context
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      
      // Replay integration for session replay (optional)
      Sentry.replayIntegration({
        maskAllText: true, // Mask sensitive text
        blockAllMedia: true, // Block media for privacy
      }),
    ],
    
    // Performance Monitoring
    // Sample rate: 1.0 = 100% of transactions, 0.1 = 10%
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    // Sample rate for replays (lower in production to reduce costs)
    replaysSessionSampleRate: environment === 'production' ? 0.01 : 0.1,
    
    // Sample rate for replays when an error occurs
    replaysOnErrorSampleRate: 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out certain errors
      const error = hint.originalException;
      
      // Don't send errors from browser extensions
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        if (
          message.includes('chrome-extension://') ||
          message.includes('moz-extension://') ||
          message.includes('safari-extension://')
        ) {
          return null;
        }
      }
      
      // Don't send cancelled requests (user navigated away)
      if (event.exception?.values?.[0]?.type === 'AbortError') {
        return null;
      }
      
      // Filter out network errors from blocked requests (ad blockers, etc.)
      if (event.exception?.values?.[0]?.type === 'TypeError' &&
          event.exception?.values?.[0]?.value?.includes('Failed to fetch')) {
        return null;
      }
      
      return event;
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Don't capture console logs in production
      if (breadcrumb.category === 'console' && environment === 'production') {
        return null;
      }
      
      // Redact sensitive data from URLs
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = redactSensitiveData(breadcrumb.data.url);
      }
      
      return breadcrumb;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension',
      'moz-extension',
      'safari-extension',
      
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      
      // Random plugins/extensions
      'Non-Error promise rejection captured',
      
      // User cancelled actions
      'User denied',
      'User cancelled',
      
      // Known benign errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
    
    // Denylist for URLs (don't send errors from these)
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      
      // Third-party scripts
      /graph\.facebook\.com/i,
      /connect\.facebook\.net/i,
    ],
  });
  
  logger.info('Sentry initialized successfully');
}

/**
 * Redact sensitive data from strings (URLs, etc.)
 */
function redactSensitiveData(str: string): string {
  // Redact email addresses
  str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  
  // Redact tokens in URLs
  str = str.replace(/([?&])(token|key|password|secret)=[^&]*/gi, '$1$2=[REDACTED]');
  
  // Redact JWT tokens
  str = str.replace(/eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[JWT_REDACTED]');
  
  return str;
}

/**
 * Manually capture an error
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Create Sentry Error Boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Profile performance of a function
 */
export function profileTransaction<T>(
  name: string,
  operation: () => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: 'function',
    },
    operation
  );
}

/**
 * Export Sentry for advanced usage
 */
export { Sentry };
