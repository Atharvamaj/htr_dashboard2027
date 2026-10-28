/**
 * Auth debugging utilities to help diagnose authentication issues
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Clear all stale authentication data from localStorage
 */
export const clearStaleAuthData = () => {
  try {
    const authKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || 
      key === 'supabase.auth.token' ||
      key.includes('supabase')
    );
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleared stale auth key: ${key}`);
    });
    
    return authKeys.length;
  } catch (error) {
    console.error('Error clearing stale auth data:', error);
    return 0;
  }
};

/**
 * Test Supabase connectivity
 */
export const testSupabaseConnection = async () => {
  try {
    const start = Date.now();
    const { data, error } = await supabase.auth.getSession();
    const duration = Date.now() - start;
    
    return {
      success: !error,
      duration,
      hasSession: !!data?.session,
      error: error?.message
    };
  } catch (error: any) {
    return {
      success: false,
      duration: 0,
      hasSession: false,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Check if Supabase URL is accessible
 */
export const checkSupabaseHealth = async () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (!supabaseUrl) {
    return {
      success: false,
      error: 'Supabase URL not configured'
    };
  }
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
      isTimeout: error.name === 'TimeoutError' || error.name === 'AbortError'
    };
  }
};

/**
 * Get diagnostic information about the auth state
 */
export const getAuthDiagnostics = async () => {
  const connection = await testSupabaseConnection();
  const health = await checkSupabaseHealth();
  const clearedKeys = clearStaleAuthData();
  
  return {
    connection,
    health,
    clearedKeys,
    timestamp: new Date().toISOString()
  };
};
