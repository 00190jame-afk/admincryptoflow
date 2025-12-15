import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notificationAudio } from '@/lib/NotificationAudio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeTrades: number;
  totalBalance: number;
  pendingWithdrawals: number;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeTrades: 0,
    totalBalance: 0,
    pendingWithdrawals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        let assignedUserIds: string[] = [];
        
        // For regular admins, get their assigned users
        if (!isSuperAdmin) {
          const { data: assignedUsers } = await supabase.rpc('get_admin_assigned_users', {
            p_admin_user_id: user.id
          });
          assignedUserIds = assignedUsers?.map((row: any) => row.user_id) || [];
          
          // If no assigned users, show zeros
          if (assignedUserIds.length === 0) {
            setStats({ totalUsers: 0, activeTrades: 0, totalBalance: 0, pendingWithdrawals: 0 });
            setLoading(false);
            return;
          }
        }

        // Fetch stats - filter by assigned users for regular admins
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

        setStats({
          totalUsers: userResult.count || 0,
          activeTrades: tradeResult.count || 0,
          totalBalance,
          pendingWithdrawals: withdrawalResult.count || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const channel = supabase.channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { notificationAudio.play(); fetchStats(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => { notificationAudio.play(); fetchStats(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_balances' }, () => { fetchStats(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdraw_requests' }, () => { notificationAudio.play(); fetchStats(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isSuperAdmin]);

  const statCards = [
    { title: t('dashboard.totalUsers'), value: stats.totalUsers, description: t('dashboard.registeredUsers'), icon: Users, color: 'text-blue-600' },
    { title: t('dashboard.activeTrades'), value: stats.activeTrades, description: t('dashboard.currentlyPending'), icon: TrendingUp, color: 'text-green-600' },
    { title: t('dashboard.totalBalance'), value: `$${stats.totalBalance.toFixed(2)}`, description: t('dashboard.combinedUserBalances'), icon: DollarSign, color: 'text-yellow-600' },
    { title: t('dashboard.pendingWithdrawals'), value: stats.pendingWithdrawals, description: t('dashboard.awaitingApproval'), icon: Activity, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
