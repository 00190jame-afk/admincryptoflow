import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminBalances, useAdminUsers, UserBalance } from '@/hooks/admin/useAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, Search, DollarSign, Lock, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const UserBalancePage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: balances = [], isLoading } = useAdminBalances();
  const { data: profiles = [] } = useAdminUsers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBalance, setSelectedBalance] = useState<UserBalance | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [balanceInputs, setBalanceInputs] = useState({
    balance: '',
    frozen: '',
    onHold: '',
    creditScore: ''
  });
  const [newBalanceIds, setNewBalanceIds] = useState<Set<string>>(new Set());

  // Track new balances from real-time updates
  useEffect(() => {
    const previousBalances = queryClient.getQueryData<UserBalance[]>(['admin', 'balances']) || [];
    const newIds = balances
      .filter(b => !previousBalances.find(pb => pb.id === b.id))
      .map(b => b.id);
    
    if (newIds.length > 0) {
      setNewBalanceIds(prev => new Set([...prev, ...newIds]));
      setTimeout(() => {
        setNewBalanceIds(prev => {
          const newSet = new Set(prev);
          newIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }, 30000);
    }
  }, [balances, queryClient]);

  const performBalanceAction = async () => {
    if (!selectedBalance) return;

    const newBalance = parseFloat(balanceInputs.balance) || 0;
    const newFrozen = parseFloat(balanceInputs.frozen) || 0;
    const newOnHold = parseFloat(balanceInputs.onHold) || 0;

    if (newBalance < 0 || newFrozen < 0 || newOnHold < 0) {
      toast({
        title: t('common.error'), 
        description: t('balance.failedUpdate'),
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_update_user_balance', {
        p_user_id: selectedBalance.user_id,
        p_balance: newBalance,
        p_frozen: newFrozen,
        p_on_hold: newOnHold,
        p_description: 'Admin balance update'
      });

      if (error) throw error;

      if (balanceInputs.creditScore !== '') {
        const newCreditScore = parseInt(balanceInputs.creditScore);
        await supabase
          .from('profiles')
          .update({ credit_score: newCreditScore })
          .eq('user_id', selectedBalance.user_id);
        
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'balances'] });
      setShowAdjustmentDialog(false);
      setSelectedBalance(null);
      setBalanceInputs({ balance: '', frozen: '', onHold: '', creditScore: '' });

      toast({
        title: t('common.success'),
        description: t('balance.balanceUpdated'),
      });
    } catch (error) {
      console.error('Error performing balance action:', error);
      toast({
        title: t('common.error'),
        description: t('balance.failedUpdate'),
        variant: "destructive",
      });
    }
  };

  const getUserProfile = (userId: string) => {
    return profiles.find(p => p.user_id === userId);
  };

  const getUserDisplayName = (userId: string) => {
    const profile = getUserProfile(userId);
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile?.email || `User ${userId.substring(0, 8)}`;
  };

  const filteredBalances = balances.filter(balance => {
    const userProfile = getUserProfile(balance.user_id);
    const searchLower = searchTerm.toLowerCase();
    
    return (
      getUserDisplayName(balance.user_id).toLowerCase().includes(searchLower) ||
      (userProfile?.email && userProfile.email.toLowerCase().includes(searchLower)) ||
      balance.user_id.toLowerCase().includes(searchLower)
    );
  });

  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
  const totalFrozen = balances.reduce((sum, b) => sum + b.frozen, 0);
  const totalOnHold = balances.reduce((sum, b) => sum + b.on_hold, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('balance.title')}</h1>
        <p className="text-muted-foreground">{t('balance.description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('balance.totalUsers')}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balances.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('balance.totalBalance')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('balance.totalFrozen')}</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalFrozen.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('balance.totalOnHold')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOnHold.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('balance.allBalances')}</CardTitle>
          <CardDescription>{t('balance.manageBalances')}</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('balance.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.user')}</TableHead>
                <TableHead>{t('users.creditScore')}</TableHead>
                <TableHead>{t('balance.availableBalance')}</TableHead>
                <TableHead>{t('balance.frozen')}</TableHead>
                <TableHead>{t('balance.onHold')}</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>{t('balance.lastUpdated')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">{t('balance.loadingBalances')}</TableCell>
                </TableRow>
              ) : filteredBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">{t('balance.noBalances')}</TableCell>
                </TableRow>
              ) : (
                filteredBalances.map((balance) => (
                  <TableRow 
                    key={balance.id}
                    className={newBalanceIds.has(balance.id) ? "bg-red-50 dark:bg-red-950/20 animate-in fade-in duration-500" : ""}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {getUserDisplayName(balance.user_id)}
                          {newBalanceIds.has(balance.id) && (
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">NEW</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{getUserProfile(balance.user_id)?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{getUserProfile(balance.user_id)?.credit_score ?? 100}</span>
                    </TableCell>
                    <TableCell className="font-medium">${balance.balance.toFixed(2)}</TableCell>
                    <TableCell>${balance.frozen.toFixed(2)}</TableCell>
                    <TableCell>${balance.on_hold.toFixed(2)}</TableCell>
                    <TableCell><span className="font-mono text-sm">{balance.currency}</span></TableCell>
                    <TableCell className="text-sm">{new Date(balance.updated_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Dialog open={showAdjustmentDialog && selectedBalance?.id === balance.id} onOpenChange={(open) => {
                        setShowAdjustmentDialog(open);
                        if (!open) {
                          setSelectedBalance(null);
                          setBalanceInputs({ balance: '', frozen: '', onHold: '', creditScore: '' });
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const profile = getUserProfile(balance.user_id);
                              setSelectedBalance(balance);
                              setBalanceInputs({
                                balance: balance.balance.toString(),
                                frozen: balance.frozen.toString(),
                                onHold: balance.on_hold.toString(),
                                creditScore: (profile?.credit_score ?? 100).toString()
                              });
                              setShowAdjustmentDialog(true);
                            }}
                          >
                            <DollarSign className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('balance.editBalance')}</DialogTitle>
                            <DialogDescription>
                              {t('balance.editBalanceFor')} {getUserDisplayName(balance.user_id)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                              <div>
                                <label className="text-sm font-medium">{t('balance.available')}</label>
                                <p className="text-lg font-bold">${balance.balance.toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">{t('balance.frozen')}</label>
                                <p className="text-lg font-bold">${balance.frozen.toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">{t('balance.onHold')}</label>
                                <p className="text-lg font-bold">${balance.on_hold.toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">{t('users.creditScore')}</label>
                                <p className="text-lg font-bold">{getUserProfile(balance.user_id)?.credit_score ?? 100}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">{t('balance.availableBalance')}</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={balanceInputs.balance}
                                  onChange={(e) => setBalanceInputs(prev => ({ ...prev, balance: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">{t('balance.frozenBalance')}</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={balanceInputs.frozen}
                                  onChange={(e) => setBalanceInputs(prev => ({ ...prev, frozen: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">{t('balance.onHoldBalance')}</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={balanceInputs.onHold}
                                  onChange={(e) => setBalanceInputs(prev => ({ ...prev, onHold: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">{t('users.creditScore')}</label>
                                <Input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="1000"
                                  placeholder="100"
                                  value={balanceInputs.creditScore}
                                  onChange={(e) => setBalanceInputs(prev => ({ ...prev, creditScore: e.target.value }))}
                                />
                              </div>
                            </div>

                            <Button onClick={performBalanceAction} className="w-full">
                              {t('balance.updateBalance')}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserBalancePage;
