import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notificationAudio } from '@/lib/NotificationAudio';
import { useToast } from '@/hooks/use-toast';

interface NotificationCounts {
  trades: number;
  withdrawals: number;
  messages: number;
  users: number;
  rechargeCodes: number;
  balanceChanges: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  isEnabled: boolean;
  volume: number;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  markAsRead: (type: keyof NotificationCounts) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [counts, setCounts] = useState<NotificationCounts>({
    trades: 0,
    withdrawals: 0,
    messages: 0,
    users: 0,
    rechargeCodes: 0,
    balanceChanges: 0,
  });
  const [isEnabled, setIsEnabled] = useState(notificationAudio.getEnabled());
  const [volume, setVolume] = useState(notificationAudio.getVolume());
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to new trades
    const tradesChannel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          setCounts(prev => ({ ...prev, trades: prev.trades + 1 }));
          notificationAudio.play();
          toast({
            title: "New Trade Created",
            description: "A new trade has been started",
          });
        }
      )
      .subscribe();

    // Subscribe to new withdrawal requests
    const withdrawalsChannel = supabase
      .channel('withdrawals-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'withdraw_requests'
        },
        (payload) => {
          setCounts(prev => ({ ...prev, withdrawals: prev.withdrawals + 1 }));
          notificationAudio.play();
          toast({
            title: "New Withdrawal Request",
            description: "A new withdrawal request has been submitted",
          });
        }
      )
      .subscribe();

    // Subscribe to new contact messages (inbox)
    const messagesChannel = supabase
      .channel('contact-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_messages'
        },
        (payload) => {
          setCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
          notificationAudio.play();
          toast({
            title: "New Message",
            description: "A new message has been received",
          });
        }
      )
      .subscribe();

    // Subscribe to new user registrations
    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          setCounts(prev => ({ ...prev, users: prev.users + 1 }));
          notificationAudio.play();
          toast({
            title: "New User Registered",
            description: "A new user has joined the platform",
          });
        }
      )
      .subscribe();

    // Subscribe to recharge code redemptions
    const rechargeChannel = supabase
      .channel('recharge-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recharge_codes'
        },
        (payload: any) => {
          // Only notify when a code is redeemed
          if (payload.new?.status === 'redeemed' && payload.old?.status !== 'redeemed') {
            setCounts(prev => ({ ...prev, rechargeCodes: prev.rechargeCodes + 1 }));
            notificationAudio.play();
            toast({
              title: "Recharge Code Redeemed",
              description: `Code redeemed for $${payload.new?.amount || 0}`,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to user balance changes
    const balanceChannel = supabase
      .channel('balance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_balances'
        },
        (payload) => {
          setCounts(prev => ({ ...prev, balanceChanges: prev.balanceChanges + 1 }));
          notificationAudio.play();
          toast({
            title: "User Balance Updated",
            description: "A user's balance has been updated",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(rechargeChannel);
      supabase.removeChannel(balanceChannel);
    };
  }, [toast]);

  const handleSetEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    notificationAudio.setEnabled(enabled);
  };

  const handleSetVolume = (newVolume: number) => {
    setVolume(newVolume);
    notificationAudio.setVolume(newVolume);
  };

  const markAsRead = (type: keyof NotificationCounts) => {
    setCounts(prev => ({ ...prev, [type]: 0 }));
  };

  return (
    <NotificationContext.Provider
      value={{
        counts,
        isEnabled,
        volume,
        setEnabled: handleSetEnabled,
        setVolume: handleSetVolume,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
