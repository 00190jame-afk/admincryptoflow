import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminReady } from '@/hooks/useAdminReady';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useEffect } from 'react';

export interface InboxMessage {
  id: string;
  type: 'inbox';
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  is_read: boolean;
  replied_at: string | null;
}

export interface OutboxMessage {
  id: string;
  type: 'outbox';
  user_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  reply_to_contact_id: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const fetchInboxMessages = async (assignedEmails: string[], isSuperAdmin: boolean): Promise<InboxMessage[]> => {
  let query = supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isSuperAdmin && assignedEmails.length > 0) {
    query = query.in('email', assignedEmails);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map(msg => ({
    ...msg,
    type: 'inbox' as const,
    is_read: msg.is_read ?? false,
    replied_at: msg.replied_at ?? null,
  }));
};

const fetchOutboxMessages = async (assignedUserIds: string[], isSuperAdmin: boolean): Promise<OutboxMessage[]> => {
  let query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isSuperAdmin && assignedUserIds.length > 0) {
    query = query.in('user_id', assignedUserIds);
  }

  const { data: messages, error } = await query;
  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  // Get profiles separately
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, email')
    .in('user_id', messages.map(m => m.user_id));

  return messages.map(message => ({
    ...message,
    type: 'outbox' as const,
    profiles: profiles?.find(p => p.user_id === message.user_id) || undefined
  }));
};

const fetchAssignedEmails = async (adminUserId: string): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_admin_assigned_users', {
    p_admin_user_id: adminUserId
  });

  if (error) throw error;

  const userIds = data?.map((row: any) => row.user_id) || [];
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('email')
    .in('user_id', userIds);

  return profiles?.map(p => p.email).filter(Boolean) || [];
};

export const useMessages = () => {
  const { isReady, user } = useAdminReady();
  const { assignedUserIds, isSuperAdmin, loading: roleLoading } = useAdminRole();
  const queryClient = useQueryClient();

  // Fetch assigned emails for inbox filtering
  const { data: assignedEmails = [] } = useQuery({
    queryKey: ['assigned-emails', user?.id],
    queryFn: () => fetchAssignedEmails(user!.id),
    enabled: isReady && !isSuperAdmin && !roleLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch inbox messages (contact_messages)
  const { data: inboxMessages = [], isLoading: inboxLoading } = useQuery({
    queryKey: ['inbox-messages', assignedEmails, isSuperAdmin],
    queryFn: () => {
      if (!isSuperAdmin && assignedEmails.length === 0) {
        return [];
      }
      return fetchInboxMessages(assignedEmails, isSuperAdmin);
    },
    enabled: isReady && !roleLoading,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fetch outbox messages (messages table)
  const { data: outboxMessages = [], isLoading: outboxLoading } = useQuery({
    queryKey: ['outbox-messages', assignedUserIds, isSuperAdmin],
    queryFn: () => {
      if (!isSuperAdmin && assignedUserIds.length === 0) {
        return [];
      }
      return fetchOutboxMessages(assignedUserIds, isSuperAdmin);
    },
    enabled: isReady && !roleLoading,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!isReady) return;

    const inboxChannel = supabase
      .channel('inbox_messages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_messages' },
        () => queryClient.invalidateQueries({ queryKey: ['inbox-messages'] })
      )
      .subscribe();

    const outboxChannel = supabase
      .channel('outbox_messages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => queryClient.invalidateQueries({ queryKey: ['outbox-messages'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inboxChannel);
      supabase.removeChannel(outboxChannel);
    };
  }, [isReady, queryClient]);

  const unreadInboxCount = inboxMessages.filter(m => !m.is_read).length;
  const pendingReplyCount = inboxMessages.filter(m => !m.replied_at).length;

  return {
    inboxMessages,
    outboxMessages,
    isLoading: inboxLoading || outboxLoading,
    unreadInboxCount,
    pendingReplyCount,
  };
};
