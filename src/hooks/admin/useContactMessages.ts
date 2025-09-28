import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminReady } from '@/hooks/useAdminReady';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useEffect } from 'react';

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

const fetchContactMessages = async (assignedEmails: string[], isSuperAdmin: boolean): Promise<ContactMessage[]> => {
  let query = supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isSuperAdmin && assignedEmails.length > 0) {
    query = query.in('email', assignedEmails);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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

export const useContactMessages = () => {
  const { isReady, user } = useAdminReady();
  const { isSuperAdmin, loading: roleLoading } = useAdminRole();
  const queryClient = useQueryClient();

  const { data: assignedEmails = [] } = useQuery({
    queryKey: ['assigned-emails', user?.id],
    queryFn: () => fetchAssignedEmails(user!.id),
    enabled: isReady && !isSuperAdmin && !roleLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['contact-messages', assignedEmails, isSuperAdmin],
    queryFn: () => fetchContactMessages(assignedEmails, isSuperAdmin),
    enabled: isReady && !roleLoading,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Real-time subscription
  useEffect(() => {
    if (!isReady) return;

    const channel = supabase
      .channel('contact_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
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
    error,
    assignedEmails
  };
};