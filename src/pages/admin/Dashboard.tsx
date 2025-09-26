import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeTrades: 0,
    totalBalance: 0,
    pendingWithdrawals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch active trades
        const { count: tradeCount } = await supabase
          .from('trades')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch total balance
        const { data: balanceData } = await supabase
          .from('user_balances')
          .select('balance');
        
        const totalBalance = balanceData?.reduce((sum, item) => sum + (item.balance || 0), 0) || 0;

        // Fetch pending withdrawals
        const { count: withdrawalCount } = await supabase
          .from('withdraw_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setStats({
          totalUsers: userCount || 0,
          activeTrades: tradeCount || 0,
          totalBalance,
          pendingWithdrawals: withdrawalCount || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Set up real-time subscriptions for dashboard stats
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          notificationAudio.play();
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades'
        },
        () => {
          notificationAudio.play();
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances'
        },
        () => {
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdraw_requests'
        },
        () => {
          notificationAudio.play();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      description: 'Registered users',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Active Trades',
      value: stats.activeTrades,
      description: 'Currently pending',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Total Balance',
      value: `$${stats.totalBalance.toFixed(2)}`,
      description: 'Combined user balances',
      icon: DollarSign,
      color: 'text-yellow-600',
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pendingWithdrawals,
      description: 'Awaiting approval',
      icon: Activity,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your crypto trading platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : card.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system activities and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No recent activities to display
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Platform health and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-600">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Services</span>
                <span className="text-sm text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Trading Engine</span>
                <span className="text-sm text-green-600">Running</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;