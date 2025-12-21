import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  adminStatusChecking: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshSession: () => Promise<boolean>;
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
  const [adminStatusChecking, setAdminStatusChecking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const checkAdminStatus = async (userId: string): Promise<void> => {
    console.log('[Auth] Starting admin status check for user:', userId);
    setAdminStatusChecking(true);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), 5000);
    });
    
    try {
      // Race between RPC calls and timeout
      const rpcPromise = Promise.all([
        supabase.rpc('is_any_admin'),
        supabase.rpc('is_super_admin')
      ]);
      
      const result = await Promise.race([rpcPromise, timeoutPromise]);
      
      if ('timeout' in result) {
        console.error('[Auth] Admin check timed out after 5 seconds');
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }
      
      const [adminResult, superAdminResult] = result;
      console.log('[Auth] RPC results:', { adminResult, superAdminResult });
      
      if (adminResult.error || superAdminResult.error) {
        console.error('[Auth] Admin check error:', adminResult.error || superAdminResult.error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }
      
      const adminStatus = adminResult.data === true;
      const superAdminStatus = superAdminResult.data === true;
      
      console.log('[Auth] Setting admin status:', { isAdmin: adminStatus, isSuperAdmin: superAdminStatus });
      setIsAdmin(adminStatus);
      setIsSuperAdmin(superAdminStatus);
    } catch (error) {
      console.error('[Auth] Admin status check error:', error);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    } finally {
      console.log('[Auth] Admin status check complete');
      setAdminStatusChecking(false);
    }
  };

  // Refresh session - returns true if successful
  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        console.error('Session refresh failed:', error);
        return false;
      }
      setSession(data.session);
      setUser(data.session.user);
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('[Auth] Session recovered from storage:', !!session);
        
        // If session error or invalid token, try to refresh
        if (sessionError || (session && !session.access_token)) {
          console.log('[Auth] Session invalid, attempting refresh...');
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData.session) {
            setSession(refreshData.session);
            setUser(refreshData.session.user);
            // Defer admin check to avoid blocking
            setTimeout(() => {
              if (mounted) checkAdminStatus(refreshData.session.user.id);
            }, 0);
          } else {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Defer admin check to avoid blocking
          if (session?.user) {
            setTimeout(() => {
              if (mounted) checkAdminStatus(session.user.id);
            }, 0);
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        }
      } catch (error) {
        console.error('[Auth] Auth initialization error:', error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener - MUST be synchronous, no async/await!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('[Auth] Auth state changed:', event);
        
        // Synchronous state updates only
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer admin check with setTimeout(0) to avoid blocking Supabase's auth flow
        if (session?.user) {
          setTimeout(() => {
            if (mounted) checkAdminStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh session every 10 minutes to prevent stale tokens
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      
      // Then sign out from Supabase (ignore errors as session might already be invalid)
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    adminStatusChecking,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isSuperAdmin,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
