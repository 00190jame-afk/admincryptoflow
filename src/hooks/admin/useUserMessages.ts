import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminReady } from '@/hooks/useAdminReady';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useEffect } from 'react';

interface UserMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const fetchUserMessages = async (assignedUserIds: string[], isSuperAdmin: boolean): Promise<UserMessage[]> => {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .in('user_id', isSuperAdmin ? [] : assignedUserIds.length > 0 ? assignedUserIds : ['00000000-0000-0000-0000-000000000000']);

  if (error) throw error;

  if (!messages || messages.length === 0) return [];

  // Get profiles separately
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, email')
    .in('user_id', messages.map(m => m.user_id));

  // Combine messages with profiles
  return messages.map(message => ({
    ...message,
    profiles: profiles?.find(p => p.user_id === message.user_id) || undefined
  }));
};

export const useUserMessages = () => {
  const { isReady } = useAdminReady();
  const { assignedUserIds, isSuperAdmin, loading: roleLoading } = useAdminRole();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['user-messages', assignedUserIds, isSuperAdmin],
    queryFn: () => fetchUserMessages(assignedUserIds, isSuperAdmin),
    enabled: isReady && !roleLoading,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Real-time subscription
  useEffect(() => {
    if (!isReady) return;

    const channel = supabase
      .channel('user_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, queryClient]);

  return {
    messages,
    isLoading,
    error
  };
};