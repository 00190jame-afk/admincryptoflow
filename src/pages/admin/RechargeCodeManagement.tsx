import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Search, Plus, DollarSign, Users, Copy, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';

interface RechargeCode {
  id: string;
  code: string;
  amount: number;
  status: string;
  user_id?: string;
  created_at: string;
  redeemed_at?: string;
  updated_at: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const RechargeCodeManagement = () => {
  const [codes, setCodes] = useState<RechargeCode[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCodeAmount, setNewCodeAmount] = useState('');
  const [showNewCodeDialog, setShowNewCodeDialog] = useState(false);
  const [newCodeIds, setNewCodeIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { markAsRead } = useNotifications();

  useEffect(() => {
    // Add small delay to ensure auth is ready
    const timeoutId = setTimeout(() => {
      fetchRechargeCodes();
      fetchProfiles();
      
      // Set up real-time subscription for new codes
      const codesChannel = supabase
        .channel('recharge-codes-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'recharge_codes'
          },
          (payload) => {
            console.log('New recharge code created:', payload.new);
            setCodes((prevCodes) => [payload.new as RechargeCode, ...prevCodes]);
            // Mark this code as new for highlighting
            setNewCodeIds((prev) => new Set([...prev, payload.new.id]));
            // Auto-remove the highlight after 30 seconds
            setTimeout(() => {
              setNewCodeIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(payload.new.id);
                return newSet;
              });
            }, 30000);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'recharge_codes'
          },
          (payload) => {
            console.log('Recharge code updated:', payload.new);
            setCodes((prevCodes) => 
              prevCodes.map((code) => 
                code.id === payload.new.id ? payload.new as RechargeCode : code
              )
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(codesChannel);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [markAsRead]);

  const fetchRechargeCodes = async (retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('recharge_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Don't log auth-related errors as real errors
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          console.warn('Auth not ready yet, skipping fetch');
          return;
        }
        throw error;
      }
      
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching recharge codes:', error);
      
      // Retry for network errors, but not auth errors
      if (retryCount < 2 && error.message?.includes('Failed to fetch') && !error.message?.includes('JWT')) {
        console.log(`Retrying fetch recharge codes, attempt ${retryCount + 1}`);
        setTimeout(() => fetchRechargeCodes(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      // Only show error toast for real errors, not auth issues
      if (!error.message?.includes('JWT') && !error.message?.includes('auth')) {
        toast({
          title: "Error",
          description: "Failed to load recharge codes",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async (retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name');

      if (error) {
        // Don't log auth-related errors as real errors
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          console.warn('Auth not ready yet, skipping profiles fetch');
          return;
        }
        throw error;
      }
      
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      
      // Retry for network errors, but not auth errors
      if (retryCount < 2 && error.message?.includes('Failed to fetch') && !error.message?.includes('JWT')) {
        console.log(`Retrying fetch profiles, attempt ${retryCount + 1}`);
        setTimeout(() => fetchProfiles(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
    }
  };

  const createRechargeCode = async () => {
    const amount = parseFloat(newCodeAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      // The code will be auto-generated by the database trigger
      const { error } = await supabase
        .from('recharge_codes')
        .insert([{ amount, code: '', status: 'unused' }]);

      if (error) throw error;
      
      setNewCodeAmount('');
      setShowNewCodeDialog(false);
      fetchRechargeCodes();
      
      toast({
        title: "Success",
        description: "Recharge code created successfully",
      });
    } catch (error) {
      console.error('Error creating recharge code:', error);
      toast({
        title: "Error",
        description: "Failed to create recharge code",
        variant: "destructive",
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
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

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (code.user_id && getUserDisplayName(code.user_id).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAmount = codes.reduce((sum, code) => sum + code.amount, 0);
  const usedAmount = codes.filter(c => c.status === 'redeemed').reduce((sum, code) => sum + code.amount, 0);
  const unusedCount = codes.filter(c => c.status === 'unused').length;
  const redeemedCount = codes.filter(c => c.status === 'redeemed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Recharge Code Management</h1>
        <p className="text-muted-foreground">
          Create and manage recharge codes for user account top-ups
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{codes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unused Codes</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{unusedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redeemed Value</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${usedAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            All Recharge Codes
            <Dialog open={showNewCodeDialog} onOpenChange={setShowNewCodeDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Recharge Code</DialogTitle>
                  <DialogDescription>
                    Generate a new recharge code with specified amount
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Amount (USDT)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount..."
                      value={newCodeAmount}
                      onChange={(e) => setNewCodeAmount(e.target.value)}
                      className="mt-1"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <Button onClick={createRechargeCode} className="w-full">
                    Create Recharge Code
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Manage recharge codes for user account funding
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search codes..."
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
                <TableHead>Code</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Redeemed By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Redeemed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading recharge codes...
                  </TableCell>
                </TableRow>
              ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No recharge codes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((code) => (
                  <TableRow 
                    key={code.id}
                    className={newCodeIds.has(code.id) ? "bg-red-50 border-red-200 animate-pulse" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {code.code}
                        </code>
                        {newCodeIds.has(code.id) && (
                          <Badge variant="destructive" className="text-xs animate-bounce">
                            <Sparkles className="h-3 w-3 mr-1" />
                            NEW
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${code.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.status === 'unused' ? 'default' : 'secondary'}>
                        {code.status === 'unused' ? 'Unused' : 'Redeemed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.user_id ? (
                        <div>
                          <div className="font-medium">{getUserDisplayName(code.user_id)}</div>
                          <div className="text-sm text-muted-foreground">
                            {getUserProfile(code.user_id)?.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(code.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {code.redeemed_at 
                        ? new Date(code.redeemed_at).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCode(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
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

export default RechargeCodeManagement;