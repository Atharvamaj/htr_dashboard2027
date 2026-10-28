/**
 * Secure Storage Utility
 * 
 * Provides encrypted storage for sensitive data in localStorage.
 * Uses AES encryption from crypto-js to protect data from XSS attacks.
 * 
 * IMPORTANT: While this adds a layer of security, remember:
 * - XSS attacks can still access the encryption key if it's in the client code
 * - httpOnly cookies are more secure for authentication tokens
 * - This is defense-in-depth, not a complete solution
 */

import CryptoJS from 'crypto-js';
import { secureLogger } from './security';

// Generate a consistent encryption key based on the session
// In production, this should be fetched from a secure backend or derived from user session
const getEncryptionKey = (): string => {
  // WARNING: This is stored in the environment. In a more secure setup,
  // you would derive this from the user's session token or fetch it from a secure endpoint
  const envKey = import.meta.env.VITE_STORAGE_ENCRYPTION_KEY;
  
  if (envKey) {
    return envKey;
  }
  
  // Fallback: Generate a session-specific key
  // This is better than nothing but not ideal for production
  let sessionKey = sessionStorage.getItem('__secure_storage_key__');
  
  if (!sessionKey) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    sessionKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('__secure_storage_key__', sessionKey);
  }
  
  return sessionKey;
};

/**
 * Secure Storage Interface
 * Drop-in replacement for localStorage with encryption
 */
export const secureStorage = {
  /**
   * Store an encrypted item in localStorage
   */
  setItem: (key: string, value: any): void => {
    try {
      const jsonValue = JSON.stringify(value);
      const encryptionKey = getEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(jsonValue, encryptionKey).toString();
      
      localStorage.setItem(key, encrypted);
    } catch (error) {
      secureLogger.error('Failed to encrypt and store item', { key, error });
      throw new Error('Failed to store encrypted data');
    }
  },

  /**
   * Retrieve and decrypt an item from localStorage
   */
  getItem: (key: string): any => {
    try {
      const encrypted = localStorage.getItem(key);
      
      if (!encrypted) {
        return null;
      }
      
      const encryptionKey = getEncryptionKey();
      const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey);
      const jsonValue = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!jsonValue) {
        // Decryption failed or empty value
        secureLogger.warn('Failed to decrypt item', { key });
        return null;
      }
      
      return JSON.parse(jsonValue);
    } catch (error) {
      secureLogger.error('Failed to retrieve and decrypt item', { key, error });
      // Return null instead of throwing to handle corrupted data gracefully
      return null;
    }
  },

  /**
   * Remove an item from localStorage
   */
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      secureLogger.error('Failed to remove item', { key, error });
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      secureLogger.error('Failed to clear localStorage', error);
    }
  },

  /**
   * Check if a key exists in localStorage
   */
  hasItem: (key: string): boolean => {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      secureLogger.error('Failed to check item existence', { key, error });
      return false;
    }
  },

  /**
   * Get all keys from localStorage (encrypted keys)
   */
  keys: (): string[] => {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      secureLogger.error('Failed to get keys', error);
      return [];
    }
  },
};

/**
 * Session Storage Interface (with encryption)
 * For data that should expire when the tab closes
 */
export const secureSessionStorage = {
  setItem: (key: string, value: any): void => {
    try {
      const jsonValue = JSON.stringify(value);
      const encryptionKey = getEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(jsonValue, encryptionKey).toString();
      
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      secureLogger.error('Failed to encrypt and store session item', { key, error });
      throw new Error('Failed to store encrypted session data');
    }
  },

  getItem: (key: string): any => {
    try {
      const encrypted = sessionStorage.getItem(key);
      
      if (!encrypted) {
        return null;
      }
      
      const encryptionKey = getEncryptionKey();
      const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey);
      const jsonValue = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!jsonValue) {
        secureLogger.warn('Failed to decrypt session item', { key });
        return null;
      }
      
      return JSON.parse(jsonValue);
    } catch (error) {
      secureLogger.error('Failed to retrieve and decrypt session item', { key, error });
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      secureLogger.error('Failed to remove session item', { key, error });
    }
  },

  clear: (): void => {
    try {
      sessionStorage.clear();
    } catch (error) {
      secureLogger.error('Failed to clear sessionStorage', error);
    }
  },
};

/**
 * Helper function to migrate existing unencrypted data to encrypted storage
 * Call this once during app initialization to migrate existing data
 */
export const migrateToSecureStorage = (keys: string[]): void => {
  secureLogger.info('Migrating data to secure storage', { keys });
  
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      
      if (value) {
        // Try to parse as JSON to see if it's already encrypted
        try {
          JSON.parse(value);
          // If we can parse it, it's unencrypted - migrate it
          secureStorage.setItem(key, JSON.parse(value));
          secureLogger.info('Migrated key to secure storage', { key });
        } catch {
          // If we can't parse it, it might already be encrypted or corrupted
          secureLogger.warn('Skipping migration for key (already encrypted or invalid)', { key });
        }
      }
    } catch (error) {
      secureLogger.error('Failed to migrate key', { key, error });
    }
  }
};

/**
 * Export a function to check if storage is available
 */
export const isStorageAvailable = (type: 'localStorage' | 'sessionStorage'): boolean => {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};
