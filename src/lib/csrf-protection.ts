/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 
 * This module provides utilities to generate and validate CSRF tokens
 * for protecting against CSRF attacks on state-changing operations.
 */

import { createLogger } from './logger';

const logger = createLogger('CSRF');

// Token storage key
const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_TIMESTAMP_KEY = 'csrf_token_timestamp';

// Token expiry time (1 hour)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the current CSRF token or generate a new one if expired
 */
export function getCsrfToken(): string {
  try {
    const token = sessionStorage.getItem(CSRF_TOKEN_KEY);
    const timestamp = sessionStorage.getItem(CSRF_TOKEN_TIMESTAMP_KEY);

    // Check if token exists and is not expired
    if (token && timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      if (tokenAge < TOKEN_EXPIRY_MS) {
        return token;
      }
    }

    // Generate new token if none exists or expired
    const newToken = generateSecureToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
    sessionStorage.setItem(CSRF_TOKEN_TIMESTAMP_KEY, Date.now().toString());
    
    logger.debug('Generated new CSRF token');
    return newToken;
  } catch (error) {
    logger.error('Error managing CSRF token', error);
    // Fallback to generating a token even if storage fails
    return generateSecureToken();
  }
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  try {
    const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    const timestamp = sessionStorage.getItem(CSRF_TOKEN_TIMESTAMP_KEY);

    if (!storedToken || !timestamp) {
      logger.warn('No CSRF token found in storage');
      return false;
    }

    // Check if token is expired
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge >= TOKEN_EXPIRY_MS) {
      logger.warn('CSRF token expired');
      clearCsrfToken();
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    if (storedToken.length !== token.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < storedToken.length; i++) {
      result |= storedToken.charCodeAt(i) ^ token.charCodeAt(i);
    }

    const isValid = result === 0;
    
    if (!isValid) {
      logger.warn('CSRF token validation failed');
    }

    return isValid;
  } catch (error) {
    logger.error('Error validating CSRF token', error);
    return false;
  }
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_TIMESTAMP_KEY);
    logger.debug('CSRF token cleared');
  } catch (error) {
    logger.error('Error clearing CSRF token', error);
  }
}

/**
 * Refresh the CSRF token (generate a new one)
 */
export function refreshCsrfToken(): string {
  clearCsrfToken();
  return getCsrfToken();
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: Record<string, string> = {}): Record<string, string> {
  const token = getCsrfToken();
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * React hook for CSRF protection
 */
export function useCsrfToken() {
  const token = getCsrfToken();

  return {
    token,
    validate: (tokenToValidate: string) => validateCsrfToken(tokenToValidate),
    refresh: refreshCsrfToken,
    clear: clearCsrfToken,
    addToHeaders: (headers?: Record<string, string>) => addCsrfHeader(headers),
  };
}

/**
 * Middleware-style function to protect an async operation
 */
export async function withCsrfProtection<T>(
  operation: () => Promise<T>,
  providedToken?: string
): Promise<T> {
  const token = providedToken || getCsrfToken();
  
  if (!validateCsrfToken(token)) {
    throw new Error('CSRF token validation failed. Please refresh the page and try again.');
  }

  return await operation();
}
