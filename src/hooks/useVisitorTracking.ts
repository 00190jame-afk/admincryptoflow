import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to track visitor IP address and user agent.
 * Call this once in your App component or main layout.
 * It will automatically update the user's profile with their IP and user agent
 * when they are logged in.
 * 
 * Usage in your main website:
 * 1. Copy this file to your project
 * 2. Update the supabase import path if needed
 * 3. Call useVisitorTracking() in your App.tsx or main layout component
 */
export const useVisitorTracking = () => {
  const hasTracked = useRef(false);

  useEffect(() => {
    const trackVisitor = async () => {
      // Only track once per session
      if (hasTracked.current) return;

      try {
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          // User not logged in, skip tracking
          return;
        }

        // Call the edge function to track visitor
        const { error } = await supabase.functions.invoke('track-visitor', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) {
          console.error('Failed to track visitor:', error);
          return;
        }

        hasTracked.current = true;
        console.log('Visitor tracked successfully');
      } catch (error) {
        console.error('Error tracking visitor:', error);
      }
    };

    trackVisitor();

    // Also track when auth state changes (user logs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !hasTracked.current) {
        trackVisitor();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
};
