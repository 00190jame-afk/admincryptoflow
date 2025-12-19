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

  const checkAdminStatus = async (userId: string, retryCount = 0): Promise<void> => {
    setAdminStatusChecking(true);
    try {
      // Use RPC functions instead of direct table queries - more reliable with auth state
      const [adminResult, superAdminResult] = await Promise.all([
        supabase.rpc('is_any_admin'),
        supabase.rpc('is_super_admin')
      ]);
      
      if (adminResult.error || superAdminResult.error) {
        const errorMessage = adminResult.error?.message || superAdminResult.error?.message || '';
        
        // Check if error is auth-related (stale/invalid session)
        if (errorMessage.toLowerCase().includes('jwt') || 
            errorMessage.toLowerCase().includes('token') || 
            errorMessage.toLowerCase().includes('auth') ||
            errorMessage.toLowerCase().includes('invalid')) {
          console.log('Stale session detected, clearing auth state...');
          // Session is stale, clear it completely
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          await supabase.auth.signOut();
          return;
        }
        
        // If first attempt fails and we haven't retried, wait and retry
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return checkAdminStatus(userId, retryCount + 1);
        }
        console.error('Admin status check failed after retries:', adminResult.error || superAdminResult.error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }
      
      setIsAdmin(adminResult.data === true);
      setIsSuperAdmin(superAdminResult.data === true);
    } catch (error) {
      console.error('Admin status check error:', error);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    } finally {
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
    let initialLoadComplete = false;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        // If session error or invalid token, try to refresh
        if (sessionError || (session && !session.access_token)) {
          console.log('Session invalid, attempting refresh...');
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData.session) {
            setSession(refreshData.session);
            setUser(refreshData.session.user);
            await checkAdminStatus(refreshData.session.user.id);
          } else {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await checkAdminStatus(session.user.id);
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } finally {
        if (mounted) {
          initialLoadComplete = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Skip if this is the initial session and we haven't completed init yet
        if (event === 'INITIAL_SESSION' && !initialLoadComplete) {
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      }
    );

    // Safety timeout - ensure loading is set to false after 5 seconds max
    const safetyTimeout = setTimeout(() => {
      if (mounted && !initialLoadComplete) {
        console.warn('Auth initialization timeout - forcing loading complete');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
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
