import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notificationAudio } from '@/lib/NotificationAudio';
import { useToast } from '@/hooks/use-toast';

interface NotificationCounts {
  trades: number;
  withdrawals: number;
  contactMessages: number;
  userMessages: number;
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
    contactMessages: 0,
    userMessages: 0,
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

    // Subscribe to new contact messages
    const contactChannel = supabase
      .channel('contact-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_messages'
        },
        (payload) => {
          setCounts(prev => ({ ...prev, contactMessages: prev.contactMessages + 1 }));
          notificationAudio.play();
          toast({
            title: "New Contact Message",
            description: "A new contact message has been received",
          });
        }
      )
      .subscribe();

    // Subscribe to new user messages
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          setCounts(prev => ({ ...prev, userMessages: prev.userMessages + 1 }));
          notificationAudio.play();
          toast({
            title: "New User Message",
            description: "A new user message has been received",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(contactChannel);
      supabase.removeChannel(messagesChannel);
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