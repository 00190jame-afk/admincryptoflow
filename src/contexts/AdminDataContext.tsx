import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAdminDataPrefetch } from '@/hooks/admin/useAdminData';
import { notificationAudio } from '@/lib/NotificationAudio';

interface AdminDataContextType {
  isInitialLoading: boolean;
  isDataReady: boolean;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export const useAdminDataContext = () => {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminDataContext must be used within AdminDataProvider');
  }
  return context;
};

export const AdminDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { loading: roleLoading } = useAdminRole();
  const { prefetchAll, isReady } = useAdminDataPrefetch();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);

  // Prefetch all data once when admin is ready
  useEffect(() => {
    if (isReady && isAdmin && !isDataReady) {
      console.log('[AdminData] Starting prefetch of all admin data...');
      prefetchAll()
        .then(() => {
          console.log('[AdminData] All data prefetched successfully');
          setIsDataReady(true);
          setIsInitialLoading(false);
        })
        .catch((error) => {
          console.error('[AdminData] Prefetch error:', error);
          setIsInitialLoading(false);
        });
    } else if (!isAdmin && !roleLoading) {
      setIsInitialLoading(false);
    }
  }, [isReady, isAdmin, roleLoading, isDataReady, prefetchAll]);

  // Set up global real-time subscriptions to invalidate cached data
  useEffect(() => {
    if (!user || !isAdmin) return;

    console.log('[AdminData] Setting up global real-time subscriptions...');

    const channel = supabase
      .channel('admin-global-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        console.log('[AdminData] Profiles changed, invalidating...');
        if (payload.eventType === 'INSERT') notificationAudio.play();
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, (payload) => {
        console.log('[AdminData] Trades changed, invalidating...');
        if (payload.eventType === 'INSERT') notificationAudio.play();
        queryClient.invalidateQueries({ queryKey: ['admin', 'trades'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recharge_codes' }, () => {
        console.log('[AdminData] Recharge codes changed, invalidating...');
        queryClient.invalidateQueries({ queryKey: ['admin', 'recharge-codes'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_balances' }, (payload) => {
        console.log('[AdminData] Balances changed, invalidating...');
        if (payload.eventType === 'INSERT') notificationAudio.play();
        queryClient.invalidateQueries({ queryKey: ['admin', 'balances'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdraw_requests' }, (payload) => {
        console.log('[AdminData] Withdrawals changed, invalidating...');
        if (payload.eventType === 'INSERT') notificationAudio.play();
        queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
        console.log('[AdminData] Messages changed, invalidating...');
        queryClient.invalidateQueries({ queryKey: ['inbox-messages'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        console.log('[AdminData] Outbox changed, invalidating...');
        queryClient.invalidateQueries({ queryKey: ['outbox-messages'] });
      })
      .subscribe();

    return () => {
      console.log('[AdminData] Cleaning up global real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, queryClient]);

  return (
    <AdminDataContext.Provider value={{ isInitialLoading, isDataReady }}>
      {children}
    </AdminDataContext.Provider>
  );
};
