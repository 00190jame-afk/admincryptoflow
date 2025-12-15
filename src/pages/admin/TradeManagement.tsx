import React, { useEffect, useState } from 'react';
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
  const { toast } = useToast();
  const { markAsRead } = useNotifications();
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
    
    // Mark trades as read when component loads
    markAsRead('trades');
    
    // Set up real-time subscription for new trades
    const tradesChannel = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          // New trade received
          // Add the new trade to the beginning of the list
          setTrades((prevTrades) => [payload.new as Trade, ...prevTrades]);
          // Mark this trade as new for highlighting
          setNewTradeIds((prev) => new Set([...prev, payload.new.id]));
          // Auto-remove the highlight after 30 seconds
          setTimeout(() => {
            setNewTradeIds((prev) => {
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
          table: 'trades'
        },
        (payload) => {
          // Trade updated
          // Update the existing trade in the list
          setTrades((prevTrades) => 
            prevTrades.map((trade) => 
              trade.id === payload.new.id ? payload.new as Trade : trade
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
    };
  }, [adminLoading, isSuperAdmin, assignedUserIds, markAsRead]);

  const fetchTrades = async () => {
    try {
      // Regular admin with no assigned users should see empty array
      if (!isSuperAdmin && assignedUserIds.length === 0) {
        setTrades([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('trades')
        .select(`
          id,
          user_id,
          email,
          trading_pair,
          direction,
          stake_amount,
          leverage,
          entry_price,
          current_price,
          status,
          result,
          profit_loss_amount,
          created_at,
          ends_at,
          completed_at
        `);

      // If not super admin, filter to only assigned users
      if (!isSuperAdmin && assignedUserIds.length > 0) {
        query = query.in('user_id', assignedUserIds);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTradeResult = async (tradeId: string, result: 'win' | 'lose') => {
    setUpdating(tradeId);
    try {
      // Updating trade

      // Call the edge function to update trade status
      const { data, error } = await supabase.functions.invoke('set-trade-win', {
        body: { tradeId }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: 'Error',
          description: `Failed to update trade: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      if (data.error) {
        console.error('Edge function returned error:', data.error);
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      // Trade updated successfully
      toast({
        title: 'Success',
        description: `Trade marked as ${result.toUpperCase()} successfully`,
      });

      setDialogOpen(null);
      // Optimistically update local state so actions hide immediately
      setTrades((prev) => prev.map((t) => (t.id === tradeId ? { ...t, status: result, result } : t)));
      // Real-time subscription will handle any additional updates
    } catch (error) {
      console.error('Unexpected error updating trade:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while updating the trade',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = 
      trade.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.trading_pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trade.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'win':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'lose':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'win':
        return <Badge className="bg-green-100 text-green-800">Win</Badge>;
      case 'lose':
        return <Badge variant="destructive">Lose</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trade Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage platform trades
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Trades</CardTitle>
          <CardDescription>
            View and manage trade results
          </CardDescription>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, pair, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="lose">Lose</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade ID</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Stake</TableHead>
                <TableHead>Leverage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    Loading trades...
                  </TableCell>
                </TableRow>
              ) : filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    No trades found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow 
                    key={trade.id} 
                    className={newTradeIds.has(trade.id) ? "bg-red-50 border-red-200 animate-pulse" : ""}
                  >
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center space-x-2">
                        <span>{trade.id.substring(0, 8)}...</span>
                        {newTradeIds.has(trade.id) && (
                          <Badge variant="destructive" className="text-xs animate-bounce">
                            <Sparkles className="h-3 w-3 mr-1" />
                            NEW
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{trade.email}</TableCell>
                    <TableCell className="font-medium">{trade.trading_pair}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {trade.direction === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className="capitalize">{trade.direction}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      ${trade.stake_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{trade.leverage}x</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(trade.status)}
                        {getStatusBadge(trade.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {trade.profit_loss_amount ? (
                        <span className={`font-mono ${
                          trade.profit_loss_amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${trade.profit_loss_amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(trade.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {trade.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Dialog 
                            open={dialogOpen === trade.id} 
                            onOpenChange={(open) => setDialogOpen(open ? trade.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Set Result
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Set as Win</DialogTitle>
                                <DialogDescription>
                                  Set trade {trade.id.substring(0, 8)}... as winning trade.
                                  <br />
                                  <span className="font-medium">
                                    {trade.trading_pair} - {trade.direction.toUpperCase()} - ${trade.stake_amount.toFixed(2)}
                                  </span>
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Alert>
                                  <AlertDescription>
                                    This action will permanently set the trade result and cannot be undone. 
                                    The system will automatically process payouts and update user balances.
                                  </AlertDescription>
                                </Alert>
                               <div className="flex justify-center">
                                  <Button
                                    onClick={() => updateTradeResult(trade.id, 'win')}
                                    disabled={updating === trade.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {updating === trade.id ? (
                                      <>Processing...</>
                                    ) : (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Set as Win
                                      </>
                                    )}
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

export default TradeManagement;