import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';

interface Trade {
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

const TradeManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { markAsRead } = useNotifications();
  const { refreshSession } = useAuth();
  const { isSuperAdmin, assignedUserIds, loading: adminLoading } = useAdminRole();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [newTradeIds, setNewTradeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (adminLoading) return;
    fetchTrades();
    markAsRead('trades');

    const tradesChannel = supabase
      .channel('trades-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, (payload) => {
        setTrades((prev) => [payload.new as Trade, ...prev]);
        setNewTradeIds((prev) => new Set([...prev, payload.new.id]));
        setTimeout(() => {
          setNewTradeIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(payload.new.id);
            return newSet;
          });
        }, 30000);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trades' }, (payload) => {
        setTrades((prev) => prev.map((trade) => trade.id === payload.new.id ? payload.new as Trade : trade));
      })
      .subscribe();

    return () => { supabase.removeChannel(tradesChannel); };
  }, [adminLoading, isSuperAdmin, assignedUserIds, markAsRead]);

  const fetchTrades = async () => {
    try {
      if (!isSuperAdmin && assignedUserIds.length === 0) {
        setTrades([]);
        setLoading(false);
        return;
      }

      let query = supabase.from('trades').select('*');
      if (!isSuperAdmin && assignedUserIds.length > 0) {
        query = query.in('user_id', assignedUserIds);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTradeResult = async (tradeId: string, result: 'win' | 'lose') => {
    setDialogOpen(null);
    setTrades((prev) => prev.map((t) => (t.id === tradeId ? { ...t, status: result, result } : t)));
    toast({ title: t('common.processing'), description: `Setting trade as ${result.toUpperCase()}...` });

    try {
      // Refresh session before calling edge function to ensure fresh token
      const sessionRefreshed = await refreshSession();
      if (!sessionRefreshed) {
        toast({ 
          title: 'Session Expired', 
          description: 'Please log out and log back in to refresh your session.',
          variant: 'destructive' 
        });
        fetchTrades();
        return;
      }

      const { data, error } = await supabase.functions.invoke('set-trade-win', { body: { tradeId } });
      
      if (error || data?.error) {
        const errorMessage = error?.message || data?.error;
        
        // Check for session-related errors
        if (errorMessage?.toLowerCase().includes('invalid user token') || 
            errorMessage?.toLowerCase().includes('session') ||
            errorMessage?.toLowerCase().includes('authorization') ||
            errorMessage?.toLowerCase().includes('unauthorized')) {
          toast({ 
            title: 'Session Expired', 
            description: 'Please log out and log back in to refresh your session.',
            variant: 'destructive' 
          });
        } else {
          toast({ 
            title: t('common.error'), 
            description: errorMessage || 'An error occurred', 
            variant: 'destructive' 
          });
        }
        fetchTrades();
        return;
      }
      toast({ title: t('common.success'), description: `Trade marked as ${result.toUpperCase()} successfully` });
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred';
      
      // Check for session-related errors in catch block too
      if (errorMessage?.toLowerCase().includes('invalid user token') || 
          errorMessage?.toLowerCase().includes('session') ||
          errorMessage?.toLowerCase().includes('failed to send')) {
        toast({ 
          title: 'Session Expired', 
          description: 'Please log out and log back in to refresh your session.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: t('common.error'), description: errorMessage, variant: 'destructive' });
      }
      fetchTrades();
    }
  };

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.trading_pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trade.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'win': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'lose': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">{t('trades.pending')}</Badge>;
      case 'win': return <Badge className="bg-green-100 text-green-800">{t('trades.win')}</Badge>;
      case 'lose': return <Badge variant="destructive">{t('trades.lose')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('trades.title')}</h1>
        <p className="text-muted-foreground">{t('trades.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('trades.allTrades')}</CardTitle>
          <CardDescription>{t('trades.viewManageTrades')}</CardDescription>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('trades.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('trades.allStatus')}</SelectItem>
                <SelectItem value="pending">{t('trades.pending')}</SelectItem>
                <SelectItem value="win">{t('trades.win')}</SelectItem>
                <SelectItem value="lose">{t('trades.lose')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('trades.tradeId')}</TableHead>
                <TableHead>{t('trades.userEmail')}</TableHead>
                <TableHead>{t('trades.pair')}</TableHead>
                <TableHead>{t('trades.direction')}</TableHead>
                <TableHead>{t('trades.stake')}</TableHead>
                <TableHead>{t('trades.leverage')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('trades.pnl')}</TableHead>
                <TableHead>{t('trades.created')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center">{t('trades.loadingTrades')}</TableCell></TableRow>
              ) : filteredTrades.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center">{t('trades.noTrades')}</TableCell></TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id} className={newTradeIds.has(trade.id) ? "bg-red-50 border-red-200 animate-pulse" : ""}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center space-x-2">
                        <span>{trade.id.substring(0, 8)}...</span>
                        {newTradeIds.has(trade.id) && (
                          <Badge variant="destructive" className="text-xs animate-bounce">
                            <Sparkles className="h-3 w-3 mr-1" />{t('common.new')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{trade.email}</TableCell>
                    <TableCell className="font-medium">{trade.trading_pair}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {trade.direction === 'up' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                        <span className="capitalize">{trade.direction === 'up' ? t('trades.up') : t('trades.down')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">${trade.stake_amount.toFixed(2)}</TableCell>
                    <TableCell>{trade.leverage}x</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">{getStatusIcon(trade.status)}{getStatusBadge(trade.status)}</div>
                    </TableCell>
                    <TableCell>
                      {trade.profit_loss_amount ? (
                        <span className={`font-mono ${trade.profit_loss_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>${trade.profit_loss_amount.toFixed(2)}</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{new Date(trade.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {trade.status === 'pending' && (
                        <Dialog open={dialogOpen === trade.id} onOpenChange={(open) => setDialogOpen(open ? trade.id : null)}>
                          <DialogTrigger asChild><Button variant="outline" size="sm">{t('trades.setResult')}</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('trades.setAsWin')}</DialogTitle>
                              <DialogDescription>{t('trades.setWinDescription')}<br /><span className="font-medium">{trade.trading_pair} - {trade.direction.toUpperCase()} - ${trade.stake_amount.toFixed(2)}</span></DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Alert><AlertDescription>{t('trades.permanentAction')}</AlertDescription></Alert>
                              <div className="flex justify-center">
                                <Button onClick={() => updateTradeResult(trade.id, 'win')} disabled={updating === trade.id} className="bg-green-600 hover:bg-green-700">
                                  {updating === trade.id ? t('common.processing') : <><CheckCircle className="mr-2 h-4 w-4" />{t('trades.setAsWin')}</>}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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

export default TradeManagement;
