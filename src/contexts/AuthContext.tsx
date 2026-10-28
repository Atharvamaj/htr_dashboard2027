import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SessionManager, RateLimiter } from '@/lib/security';
import { logger } from "@/utils/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSessionExpired: boolean;
  refreshSession: () => Promise<void>;
  ensureProfileExists: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  
  // Rate limiter for authentication attempts
  const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

  // Session refresh function
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      setSession(session);
      setUser(session?.user ?? null);
      SessionManager.setLastActivity();
    } catch (error) {
      logger.error('Error refreshing session:', error);
      setIsSessionExpired(true);
    }
  }, []);

  // Ensure profile exists for the current user
  const ensureProfileExists = useCallback(async () => {
    if (!user) return;
    
    try {
      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      // If profile doesn't exist, create it
      if (checkError && checkError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email || '',
            is_admin: false,
          });
        
        if (insertError) {
          logger.error('Error creating profile:', insertError);
        } else {
          logger.log('Profile created successfully for user:', user.id);
        }
      }
    } catch (error) {
      logger.error('Error ensuring profile exists:', error);
    }
  }, [user]);

  // Check session validity periodically
  useEffect(() => {
    const checkSession = () => {
      if (SessionManager.isSessionExpired()) {
        setIsSessionExpired(true);
        signOut();
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Set up auth state listener with security enhancements
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update last activity on auth events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          SessionManager.setLastActivity();
          setIsSessionExpired(false);
          // Ensure profile exists for new or returning users
          if (session?.user) {
            setTimeout(() => ensureProfileExists(), 100); // Small delay to ensure user state is set
          }
        }
        
        if (event === 'SIGNED_OUT') {
          setIsSessionExpired(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        SessionManager.setLastActivity();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsSessionExpired(false);
      
      // Clear session data
      localStorage.removeItem('lastActivity');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  }, []);

  const value = {
    user,
    session,
    loading,
    signOut,
    isSessionExpired,
    refreshSession,
    ensureProfileExists,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};