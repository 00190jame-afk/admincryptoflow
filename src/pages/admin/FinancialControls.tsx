import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WithdrawRequest {
  id: string;
  user_id: string;
  email: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
  withdraw_code?: string;
}

interface BalanceAdjustment {
  userId: string;
  amount: string;
  type: 'add' | 'subtract';
  description: string;
}

const FinancialControls = () => {
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [balanceAdjustment, setBalanceAdjustment] = useState<BalanceAdjustment>({
    userId: '',
    amount: '',
    type: 'add',
    description: ''
  });
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    fetchWithdrawRequests();
  }, []);

  const fetchWithdrawRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdraw requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawRequest = async (requestId: string, action: 'approved' | 'rejected', notes?: string) => {
    setProcessing(requestId);
    try {
      const updateData: any = {
        status: action,
        processed_at: new Date().toISOString()
      };

      if (notes) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('withdraw_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: `Withdrawal ${action}`,
        description: `Withdrawal request has been ${action} successfully.`,
      });

      fetchWithdrawRequests();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to process withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const adjustUserBalance = async () => {
    if (!balanceAdjustment.userId || !balanceAdjustment.amount || !balanceAdjustment.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setAdjusting(true);
    try {
      const amount = parseFloat(balanceAdjustment.amount);
      const adjustmentAmount = balanceAdjustment.type === 'subtract' ? -amount : amount;

      const { error } = await supabase.rpc('update_user_balance', {
        p_user_id: balanceAdjustment.userId,
        p_amount: adjustmentAmount,
        p_transaction_type: 'manual_adjustment',
        p_description: balanceAdjustment.description
      });

      if (error) throw error;

      toast({
        title: "Balance adjusted",
        description: "User balance has been updated successfully.",
      });

      setBalanceAdjustment({
        userId: '',
        amount: '',
        type: 'add',
        description: ''
      });
    } catch (error: any) {
      console.error('Error adjusting balance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust user balance.",
        variant: "destructive",
      });
    } finally {
      setAdjusting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = withdrawRequests.filter(req => req.status === 'pending');
  const totalPendingAmount = pendingRequests.reduce((sum, req) => sum + req.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Financial Controls</h1>
        <p className="text-muted-foreground">
          Manage withdrawals and user balances
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPendingAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {withdrawRequests.filter(req => 
                req.status === 'approved' && 
                new Date(req.processed_at!).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full">
                  Adjust Balance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adjust User Balance</DialogTitle>
                  <DialogDescription>
                    Manually adjust a user's balance with proper documentation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      placeholder="Enter user ID"
                      value={balanceAdjustment.userId}
                      onChange={(e) => setBalanceAdjustment(prev => ({ ...prev, userId: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adjustmentType">Type</Label>
                      <Select 
                        value={balanceAdjustment.type} 
                        onValueChange={(value: 'add' | 'subtract') => 
                          setBalanceAdjustment(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Add Funds</SelectItem>
                          <SelectItem value="subtract">Subtract Funds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={balanceAdjustment.amount}
                        onChange={(e) => setBalanceAdjustment(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Reason for balance adjustment..."
                      value={balanceAdjustment.description}
                      onChange={(e) => setBalanceAdjustment(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <Alert>
                    <AlertDescription>
                      This action will create an audit trail and transaction record.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={adjustUserBalance} disabled={adjusting} className="w-full">
                    {adjusting ? 'Processing...' : 'Adjust Balance'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>
            Review and process user withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Withdraw Code</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading withdrawal requests...
                  </TableCell>
                </TableRow>
              ) : withdrawRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No withdrawal requests found
                  </TableCell>
                </TableRow>
              ) : (
                withdrawRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.email}</TableCell>
                    <TableCell className="font-mono">
                      ${request.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {request.processed_at 
                        ? new Date(request.processed_at).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {request.withdraw_code ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {request.withdraw_code}
                        </code>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={processing === request.id}
                              >
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Process Withdrawal Request</DialogTitle>
                                <DialogDescription>
                                  Review and approve or reject this withdrawal request
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>User</Label>
                                    <p className="text-sm text-muted-foreground">{request.email}</p>
                                  </div>
                                  <div>
                                    <Label>Amount</Label>
                                    <p className="text-sm font-mono">${request.amount.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-4">
                                  <Button
                                    onClick={() => processWithdrawRequest(request.id, 'approved')}
                                    disabled={processing === request.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => processWithdrawRequest(request.id, 'rejected', 'Rejected by admin')}
                                    disabled={processing === request.id}
                                    variant="destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
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

export default FinancialControls;