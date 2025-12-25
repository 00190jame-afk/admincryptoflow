import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, CheckCircle, XCircle, CreditCard, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTranslation } from 'react-i18next';

interface WithdrawRequest {
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

interface UserProfile {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const WithdrawalRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { isSuperAdmin, assignedUserIds, loading: adminLoading } = useAdminRole();
  const { markAsRead } = useNotifications();

  useEffect(() => {
    if (!adminLoading) {
      fetchWithdrawRequests();
      fetchProfiles();
      
      // Mark withdrawal requests as read when component loads
      markAsRead('withdrawals');
      
      // Set up real-time subscription for new withdrawal requests
      const requestsChannel = supabase
        .channel('withdraw-requests-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'withdraw_requests'
          },
          (payload) => {
            // New withdrawal request received
            setRequests((prevRequests) => [payload.new as WithdrawRequest, ...prevRequests]);
            // Mark this request as new for highlighting
            setNewRequestIds((prev) => new Set([...prev, payload.new.id]));
            // Auto-remove the highlight after 30 seconds
            setTimeout(() => {
              setNewRequestIds((prev) => {
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
            table: 'withdraw_requests'
          },
          (payload) => {
            // Withdrawal request updated
            setRequests((prevRequests) => 
              prevRequests.map((request) => 
                request.id === payload.new.id ? payload.new as WithdrawRequest : request
              )
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(requestsChannel);
      };
    }
  }, [adminLoading, isSuperAdmin, assignedUserIds]);

  const fetchWithdrawRequests = async () => {
    try {
      let query = supabase
        .from('withdraw_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter withdrawal requests for regular admins to only show assigned users
      if (!isSuperAdmin) {
        if (assignedUserIds.length > 0) {
          query = query.in('user_id', assignedUserIds);
        } else {
          // Regular admin with no assigned users should see no data
          query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      toast({
        title: t('common.error'),
        description: t('withdrawals.failedLoad'),
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
      if (!isSuperAdmin) {
        if (assignedUserIds.length > 0) {
          query = query.in('user_id', assignedUserIds);
        } else {
          // Regular admin with no assigned users should see no data
          query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const processWithdrawRequest = async (requestId: string, action: 'approved' | 'rejected', notes?: string) => {
    try {
      const updates: any = {
        status: action,
        // Don't set processed_at here - let the database trigger handle it
      };

      if (notes) {
        updates.admin_notes = notes;
      }

      const { error } = await supabase
        .from('withdraw_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      fetchWithdrawRequests();
      setSelectedRequest(null);
      setAdminNotes('');

      toast({
        title: t('common.success'),
        description: action === 'approved' ? t('withdrawals.withdrawalApproved') : t('withdrawals.withdrawalRejected'),
      });
    } catch (error) {
      console.error('Error processing withdrawal request:', error);
      toast({
        title: t('common.error'),
        description: t('withdrawals.failedProcess'),
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{t('trades.pending')}</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">{t('withdrawals.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">{t('withdrawals.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('withdrawals.title')}</h1>
        <p className="text-muted-foreground">
          {t('withdrawals.description')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('withdrawals.pendingWithdrawals')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('withdrawals.requestsAwaiting')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('withdrawals.pendingAmount')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {t('withdrawals.totalPendingAmount')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('withdrawals.allRequests')}</CardTitle>
          <CardDescription>
            {t('withdrawals.reviewManage')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.user')}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.code')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t('withdrawals.loadingRequests')}
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t('withdrawals.noRequests')}
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow 
                    key={request.id}
                    className={newRequestIds.has(request.id) ? "bg-red-50 border-red-200 animate-pulse" : ""}
                  >
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        {new Date(request.created_at).toLocaleString()}
                        {newRequestIds.has(request.id) && (
                          <Badge variant="destructive" className="text-xs animate-bounce">
                            <Sparkles className="h-3 w-3 mr-1" />
                            NEW
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getUserDisplayName(request.user_id)}</div>
                        <div className="text-sm text-muted-foreground">
                          {getUserProfile(request.user_id)?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${request.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.withdraw_code && (
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {request.withdraw_code}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  {t('withdrawals.review')}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t('withdrawals.reviewRequest')}</DialogTitle>
                                  <DialogDescription>
                                    {t('withdrawals.requestId')}: {request.id}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">{t('common.amount')}</label>
                                      <p className="text-lg font-bold">${request.amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">{t('withdrawals.userId')}</label>
                                      <p className="text-sm font-mono">{request.user_id}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">{t('withdrawals.requestedAt')}</label>
                                    <p>{new Date(request.created_at).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">{t('withdrawals.adminNotes')}</label>
                                    <Textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder={t('withdrawals.addNotes')}
                                      rows={3}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button className="flex-1">
                                          {t('withdrawals.approve')}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>{t('withdrawals.approveWithdrawal')}</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            {t('withdrawals.approveConfirm')} ${request.amount.toFixed(2)}?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => processWithdrawRequest(request.id, 'approved', adminNotes)}
                                          >
                                            {t('withdrawals.approve')}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="flex-1">
                                          {t('withdrawals.reject')}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>{t('withdrawals.rejectWithdrawal')}</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            {t('withdrawals.rejectConfirm')}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => processWithdrawRequest(request.id, 'rejected', adminNotes)}
                                          >
                                            {t('withdrawals.reject')}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
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

export default WithdrawalRequests;