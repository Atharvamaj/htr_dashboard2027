import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { validateEnvironment } from '@/lib/security';
import { getCsrfToken } from '@/lib/csrf-protection';

// Validate all environment variables first
validateEnvironment();

// Get Supabase credentials from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
  global: {
    headers: {
      'X-Client-Info': 'htr-dashboard@1.0.0',
      // Add CSRF token to all requests for additional protection
      'X-CSRF-Token': getCsrfToken(),
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get Supabase client with fresh CSRF token
// Use this for operations that require up-to-date CSRF protection
export const getSupabaseWithFreshCsrf = () => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
    global: {
      headers: {
        'X-Client-Info': 'htr-dashboard@1.0.0',
        'X-CSRF-Token': getCsrfToken(), // Fresh token for each call
      },
    },
  });
};
