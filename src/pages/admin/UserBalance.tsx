import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Wallet, Plus, Minus, Search, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserBalances();
    fetchProfiles();
  }, []);

  const fetchUserBalances = async () => {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .order('updated_at', { ascending: false });

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
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const adjustUserBalance = async () => {
    if (!selectedBalance || !adjustmentAmount) return;

    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount)) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('update_user_balance', {
        p_user_id: selectedBalance.user_id,
        p_amount: amount,
        p_transaction_type: 'manual',
        p_description: adjustmentDescription || `Manual balance adjustment by admin`
      });

      if (error) throw error;

      fetchUserBalances();
      setShowAdjustmentDialog(false);
      setSelectedBalance(null);
      setAdjustmentAmount('');
      setAdjustmentDescription('');

      toast({
        title: "Success",
        description: "User balance adjusted successfully",
      });
    } catch (error) {
      console.error('Error adjusting balance:', error);
      toast({
        title: "Error",
        description: "Failed to adjust user balance",
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
          Monitor and manage user account balances
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
            <Minus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalFrozen.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total On Hold</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
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
            View and manage all user account balances
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
                  <TableRow key={balance.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getUserDisplayName(balance.user_id)}</div>
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
                          setAdjustmentAmount('');
                          setAdjustmentDescription('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedBalance(balance);
                              setShowAdjustmentDialog(true);
                            }}
                          >
                            Adjust
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adjust User Balance</DialogTitle>
                            <DialogDescription>
                              Manually adjust balance for {getUserDisplayName(balance.user_id)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Current Balance</label>
                              <p className="text-lg font-bold">${balance.balance.toFixed(2)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Adjustment Amount</label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Enter amount (positive to add, negative to subtract)"
                                value={adjustmentAmount}
                                onChange={(e) => setAdjustmentAmount(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Use positive numbers to add funds, negative to subtract
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Description</label>
                              <Textarea
                                placeholder="Reason for adjustment..."
                                value={adjustmentDescription}
                                onChange={(e) => setAdjustmentDescription(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => {
                                  setShowAdjustmentDialog(false);
                                  setSelectedBalance(null);
                                  setAdjustmentAmount('');
                                  setAdjustmentDescription('');
                                }}
                              >
                                Cancel
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button className="flex-1" disabled={!adjustmentAmount}>
                                    Apply Adjustment
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Balance Adjustment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to adjust {getUserDisplayName(balance.user_id)}'s balance by ${adjustmentAmount}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={adjustUserBalance}>
                                      Confirm
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