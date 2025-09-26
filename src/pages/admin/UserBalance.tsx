import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notificationAudio } from '@/lib/NotificationAudio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Wallet, Plus, Minus, Search, DollarSign, Lock, Unlock, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminRole } from '@/hooks/useAdminRole';

interface UserBalance {
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

interface UserProfile {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const UserBalance = () => {
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBalance, setSelectedBalance] = useState<UserBalance | null>(null);
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [balanceInputs, setBalanceInputs] = useState({
    balance: '',
    frozen: '',
    onHold: ''
  });
  const [newBalanceIds, setNewBalanceIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { isSuperAdmin, assignedUserIds, loading: adminLoading } = useAdminRole();

  useEffect(() => {
    if (!adminLoading) {
      fetchUserBalances();
      fetchProfiles();
      
      // Set up real-time subscription for balance updates
      const channel = supabase
        .channel('user-balances-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_balances'
          },
          (payload) => {
            console.log('Balance change detected:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newBalance = payload.new as UserBalance;
              setBalances(prev => [newBalance, ...prev]);
              setNewBalanceIds(prev => new Set([...prev, newBalance.id]));
              notificationAudio.play();
              
              setTimeout(() => {
                setNewBalanceIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(newBalance.id);
                  return newSet;
                });
              }, 30000);
            } else if (payload.eventType === 'UPDATE') {
              const updatedBalance = payload.new as UserBalance;
              setBalances(prev => prev.map(balance => 
                balance.id === updatedBalance.id ? updatedBalance : balance
              ));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [adminLoading, isSuperAdmin, assignedUserIds]);

  const fetchUserBalances = async () => {
    try {
      let query = supabase
        .from('user_balances')
        .select('*')
        .order('updated_at', { ascending: false });

      // Filter balances for regular admins to only show assigned users
      if (!isSuperAdmin && assignedUserIds.length > 0) {
        query = query.in('user_id', assignedUserIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBalances(data || []);
    } catch (error) {
      console.error('Error fetching user balances:', error);
      toast({
        title: "Error",
        description: "Failed to load user balances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name');

      // Filter profiles for regular admins to only show assigned users
      if (!isSuperAdmin && assignedUserIds.length > 0) {
        query = query.in('user_id', assignedUserIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const performBalanceAction = async () => {
    if (!selectedBalance) return;

    // Get the values from the input fields
    const newBalance = parseFloat(balanceInputs.balance) || 0;
    const newFrozen = parseFloat(balanceInputs.frozen) || 0;
    const newOnHold = parseFloat(balanceInputs.onHold) || 0;

    // Validate inputs
    if (newBalance < 0 || newFrozen < 0 || newOnHold < 0) {
      toast({
        title: "Error", 
        description: "All amounts must be positive",
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
        p_description: adjustmentDescription || 'Admin balance update'
      });

      if (error) throw error;

      fetchUserBalances();
      setShowAdjustmentDialog(false);
      setSelectedBalance(null);
      setBalanceInputs({ balance: '', frozen: '', onHold: '' });
      setAdjustmentDescription('');

      toast({
        title: "Success",
        description: "User balance updated successfully",
      });
    } catch (error) {
      console.error('Error performing balance action:', error);
      toast({
        title: "Error",
        description: `Failed to update user balance`,
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
        <h1 className="text-3xl font-bold text-foreground">User Balance Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage user account balances - Set balances directly in each field
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balances.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Frozen</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalFrozen.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total On Hold</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOnHold.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Balances</CardTitle>
          <CardDescription>
            View and manage all user account balances - Click the dollar icon to edit balances directly
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
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
                <TableHead>User</TableHead>
                <TableHead>Available Balance</TableHead>
                <TableHead>Frozen</TableHead>
                <TableHead>On Hold</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading user balances...
                  </TableCell>
                </TableRow>
              ) : filteredBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No user balances found
                  </TableCell>
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
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getUserProfile(balance.user_id)?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${balance.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${balance.frozen.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${balance.on_hold.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{balance.currency}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(balance.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Dialog open={showAdjustmentDialog && selectedBalance?.id === balance.id} onOpenChange={(open) => {
                        setShowAdjustmentDialog(open);
                        if (!open) {
                          setSelectedBalance(null);
                          setBalanceInputs({ balance: '', frozen: '', onHold: '' });
                          setAdjustmentDescription('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedBalance(balance);
                              setBalanceInputs({
                                balance: balance.balance.toString(),
                                frozen: balance.frozen.toString(),
                                onHold: balance.on_hold.toString()
                              });
                              setShowAdjustmentDialog(true);
                            }}
                          >
                            <DollarSign className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manage User Balance</DialogTitle>
                            <DialogDescription>
                              Update balance fields directly for {getUserDisplayName(balance.user_id)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                              <div>
                                <label className="text-sm font-medium">Current Available</label>
                                <p className="text-lg font-bold">${balance.balance.toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Current Frozen</label>
                                <p className="text-lg font-bold">${balance.frozen.toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Current On Hold</label>
                                <p className="text-lg font-bold">${balance.on_hold.toFixed(2)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Available Balance</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={balanceInputs.balance}
                                  onChange={(e) => setBalanceInputs(prev => ({ ...prev, balance: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Set to 0 to move all to other fields</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Frozen Balance</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={balanceInputs.frozen}
                                  onChange={(e) => setBalanceInputs(prev => ({ ...prev, frozen: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Frozen funds (restricted)</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">On Hold Balance</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={balanceInputs.onHold}
                                  onChange={(e) => setBalanceInputs(prev => ({ ...prev, onHold: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Temporarily held funds</p>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block">Description</label>
                              <Textarea
                                placeholder="Reason for balance update..."
                                value={adjustmentDescription}
                                onChange={(e) => setAdjustmentDescription(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button>
                                    Update Balance
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Balance Update</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to update {getUserDisplayName(balance.user_id)}'s balance? This action will be logged for audit purposes.
                                      <br /><br />
                                      New values:
                                      <br />• Available: ${parseFloat(balanceInputs.balance || '0').toFixed(2)}
                                      <br />• Frozen: ${parseFloat(balanceInputs.frozen || '0').toFixed(2)}
                                      <br />• On Hold: ${parseFloat(balanceInputs.onHold || '0').toFixed(2)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={performBalanceAction}>
                                      Confirm Update
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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

export default UserBalance;