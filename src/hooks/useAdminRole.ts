import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminRoleInfo {
  isSuperAdmin: boolean;
  isRegularAdmin: boolean;
  isAnyAdmin: boolean;
  assignedUserIds: string[];
  loading: boolean;
}

export const useAdminRole = (): AdminRoleInfo => {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedUsers = async () => {
      if (!user || !isAdmin) {
        setLoading(false);
        return;
      }

      // Super admins can see all users, so don't need to fetch assigned users
      if (isSuperAdmin) {
        setLoading(false);
        return;
      }

      try {
        // Get assigned user IDs for regular admins
        const { data, error } = await supabase.rpc('get_admin_assigned_users', {
          p_admin_user_id: user.id
        });

        if (error) throw error;
        
        const userIds = data?.map((row: any) => row.user_id) || [];
        setAssignedUserIds(userIds);
      } catch (error) {
        console.error('Error fetching assigned users:', error);
        setAssignedUserIds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedUsers();
  }, [user, isAdmin, isSuperAdmin]);

  return {
    isSuperAdmin,
    isRegularAdmin: isAdmin && !isSuperAdmin,
    isAnyAdmin: isAdmin,
    assignedUserIds,
    loading
  };
};