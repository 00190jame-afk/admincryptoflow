import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';

// ============ TYPES ============

export interface DashboardStats {
  totalUsers: number;
  activeTrades: number;
  totalBalance: number;
  pendingWithdrawals: number;
}

export interface User {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  credit_score: number | null;
  wallet_address: string | null;
  ip_address: string | null;
  ip_country: string | null;
  user_agent: string | null;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface Trade {
  id: string;
  user_id: string;
  email: string;
  trading_pair: string;
  direction: string;
  stake_amount: number;
  leverage: number;
  entry_price: number;
  current_price?: number;
  status: string;
  result?: string;
  profit_loss_amount?: number;
  created_at: string;
  ends_at?: string;
  completed_at?: string;
}

export interface RechargeCode {
  id: string;
  code: string;
  amount: number;
  status: string;
  user_id?: string;
  created_by?: string;
  created_at: string;
  redeemed_at?: string;
  updated_at: string;
}

export interface UserBalance {
  id: string;
  user_id: string;
  balance: number;
  frozen: number;
  on_hold: number;
  currency: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface WithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
  withdraw_code?: string;
  email?: string;
}

// ============ FETCH FUNCTIONS ============

const fetchDashboardStats = async (
  userId: string,
  isSuperAdmin: boolean,
  assignedUserIds: string[]
): Promise<DashboardStats> => {
  if (!isSuperAdmin && assignedUserIds.length === 0) {
    return { totalUsers: 0, activeTrades: 0, totalBalance: 0, pendingWithdrawals: 0 };
  }

  let userQuery = supabase.from('profiles').select('*', { count: 'exact', head: true });
  let tradeQuery = supabase.from('trades').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  let balanceQuery = supabase.from('user_balances').select('balance');
  let withdrawalQuery = supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

  if (!isSuperAdmin && assignedUserIds.length > 0) {
    userQuery = userQuery.in('user_id', assignedUserIds);
    tradeQuery = tradeQuery.in('user_id', assignedUserIds);
    balanceQuery = balanceQuery.in('user_id', assignedUserIds);
    withdrawalQuery = withdrawalQuery.in('user_id', assignedUserIds);
  }

  const [userResult, tradeResult, balanceResult, withdrawalResult] = await Promise.all([
    userQuery,
    tradeQuery,
    balanceQuery,
    withdrawalQuery
  ]);

  const totalBalance = balanceResult.data?.reduce((sum, item) => sum + (item.balance || 0), 0) || 0;

  return {
    totalUsers: userResult.count || 0,
    activeTrades: tradeResult.count || 0,
    totalBalance,
    pendingWithdrawals: withdrawalResult.count || 0
  };
};

const fetchUsers = async (isSuperAdmin: boolean, assignedUserIds: string[]): Promise<User[]> => {
  let query = supabase
    .from('profiles')
    .select('id, user_id, email, username, credit_score, wallet_address, ip_address, ip_country, user_agent, created_at, first_name, last_name');

  if (!isSuperAdmin && assignedUserIds.length > 0) {
    query = query.in('user_id', assignedUserIds);
  } else if (!isSuperAdmin) {
    return [];
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const fetchTrades = async (isSuperAdmin: boolean, assignedUserIds: string[]): Promise<Trade[]> => {
  if (!isSuperAdmin && assignedUserIds.length === 0) {
    return [];
  }

  let query = supabase.from('trades').select('*');
  if (!isSuperAdmin && assignedUserIds.length > 0) {
    query = query.in('user_id', assignedUserIds);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
};

const fetchRechargeCodes = async (
  userId: string,
  isSuperAdmin: boolean,
  assignedUserIds: string[]
): Promise<RechargeCode[]> => {
  let query = supabase
    .from('recharge_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isSuperAdmin && userId) {
    if (assignedUserIds.length > 0) {
      query = query.or(`created_by.eq.${userId},user_id.in.(${assignedUserIds.join(',')})`);
    } else {
      query = query.eq('created_by', userId);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const fetchUserBalances = async (isSuperAdmin: boolean, assignedUserIds: string[]): Promise<UserBalance[]> => {
  if (!isSuperAdmin && assignedUserIds.length === 0) {
    return [];
  }

  let query = supabase
    .from('user_balances')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!isSuperAdmin && assignedUserIds.length > 0) {
    query = query.in('user_id', assignedUserIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const fetchWithdrawRequests = async (isSuperAdmin: boolean, assignedUserIds: string[]): Promise<WithdrawRequest[]> => {
  let query = supabase
    .from('withdraw_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isSuperAdmin) {
    if (assignedUserIds.length > 0) {
      query = query.in('user_id', assignedUserIds);
    } else {
      return [];
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// ============ HOOKS ============

// Long stale time to prevent refetch on navigation
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

export const useAdminDashboard = () => {
  const { user, isSuperAdmin } = useAuth();
  const { assignedUserIds, loading: roleLoading } = useAdminRole();

  return useQuery({
    queryKey: ['admin', 'dashboard', user?.id, isSuperAdmin, assignedUserIds],
    queryFn: () => fetchDashboardStats(user!.id, isSuperAdmin, assignedUserIds),
    enabled: !!user && !roleLoading,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useAdminUsers = () => {
  const { isSuperAdmin } = useAuth();
  const { assignedUserIds, loading: roleLoading } = useAdminRole();

  return useQuery({
    queryKey: ['admin', 'users', isSuperAdmin, assignedUserIds],
    queryFn: () => fetchUsers(isSuperAdmin, assignedUserIds),
    enabled: !roleLoading,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useAdminTrades = () => {
  const { isSuperAdmin } = useAuth();
  const { assignedUserIds, loading: roleLoading } = useAdminRole();

  return useQuery({
    queryKey: ['admin', 'trades', isSuperAdmin, assignedUserIds],
    queryFn: () => fetchTrades(isSuperAdmin, assignedUserIds),
    enabled: !roleLoading,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useAdminRechargeCodes = () => {
  const { user, isSuperAdmin } = useAuth();
  const { assignedUserIds, loading: roleLoading } = useAdminRole();

  return useQuery({
    queryKey: ['admin', 'recharge-codes', user?.id, isSuperAdmin, assignedUserIds],
    queryFn: () => fetchRechargeCodes(user!.id, isSuperAdmin, assignedUserIds),
    enabled: !!user && !roleLoading,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useAdminBalances = () => {
  const { isSuperAdmin } = useAuth();
  const { assignedUserIds, loading: roleLoading } = useAdminRole();

  return useQuery({
    queryKey: ['admin', 'balances', isSuperAdmin, assignedUserIds],
    queryFn: () => fetchUserBalances(isSuperAdmin, assignedUserIds),
    enabled: !roleLoading,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useAdminWithdrawals = () => {
  const { isSuperAdmin } = useAuth();
  const { assignedUserIds, loading: roleLoading } = useAdminRole();

  return useQuery({
    queryKey: ['admin', 'withdrawals', isSuperAdmin, assignedUserIds],
    queryFn: () => fetchWithdrawRequests(isSuperAdmin, assignedUserIds),
    enabled: !roleLoading,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

// ============ PREFETCH HOOK ============

export const useAdminDataPrefetch = () => {
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const { assignedUserIds, loading: roleLoading } = useAdminRole();

  const prefetchAll = async () => {
    if (!user || roleLoading) return;

    const promises = [
      queryClient.prefetchQuery({
        queryKey: ['admin', 'dashboard', user.id, isSuperAdmin, assignedUserIds],
        queryFn: () => fetchDashboardStats(user.id, isSuperAdmin, assignedUserIds),
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ['admin', 'users', isSuperAdmin, assignedUserIds],
        queryFn: () => fetchUsers(isSuperAdmin, assignedUserIds),
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ['admin', 'trades', isSuperAdmin, assignedUserIds],
        queryFn: () => fetchTrades(isSuperAdmin, assignedUserIds),
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ['admin', 'recharge-codes', user.id, isSuperAdmin, assignedUserIds],
        queryFn: () => fetchRechargeCodes(user.id, isSuperAdmin, assignedUserIds),
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ['admin', 'balances', isSuperAdmin, assignedUserIds],
        queryFn: () => fetchUserBalances(isSuperAdmin, assignedUserIds),
        staleTime: STALE_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: ['admin', 'withdrawals', isSuperAdmin, assignedUserIds],
        queryFn: () => fetchWithdrawRequests(isSuperAdmin, assignedUserIds),
        staleTime: STALE_TIME,
      }),
    ];

    await Promise.all(promises);
  };

  return { prefetchAll, isReady: !!user && !roleLoading };
};
