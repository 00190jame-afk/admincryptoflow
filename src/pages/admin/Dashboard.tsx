import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminDashboard } from '@/hooks/admin/useAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useAdminDashboard();

  const statCards = [
    { 
      title: t('dashboard.totalUsers'), 
      value: stats?.totalUsers ?? 0, 
      description: t('dashboard.registeredUsers'), 
      icon: Users, 
      color: 'text-blue-600' 
    },
    { 
      title: t('dashboard.activeTrades'), 
      value: stats?.activeTrades ?? 0, 
      description: t('dashboard.currentlyPending'), 
      icon: TrendingUp, 
      color: 'text-green-600' 
    },
    { 
      title: t('dashboard.totalBalance'), 
      value: `$${(stats?.totalBalance ?? 0).toFixed(2)}`, 
      description: t('dashboard.combinedUserBalances'), 
      icon: DollarSign, 
      color: 'text-yellow-600' 
    },
    { 
      title: t('dashboard.pendingWithdrawals'), 
      value: stats?.pendingWithdrawals ?? 0, 
      description: t('dashboard.awaitingApproval'), 
      icon: Activity, 
      color: 'text-orange-600' 
    },
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
              <div className="text-2xl font-bold">{isLoading ? '...' : card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
