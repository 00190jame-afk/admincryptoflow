import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TradeRule {
  id: string;
  min_stake: number;
  max_stake: number;
  profit_rate: number;
  created_at: string;
}

interface FormData {
  min_stake: string;
  max_stake: string;
  profit_rate: string;
}

const initialFormData: FormData = { min_stake: '', max_stake: '', profit_rate: '' };

export default function TradeRules() {
  const { t } = useTranslation();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TradeRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<TradeRule | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['trade-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trade_rules').select('*').order('min_stake', { ascending: true });
      if (error) throw error;
      return data as TradeRule[];
    },
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<TradeRule, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('trade_rules').insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trade-rules'] }); toast.success(t('rules.ruleCreated')); handleCloseDialog(); },
    onError: (error: any) => { toast.error(error.message || t('rules.failedCreate')); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; min_stake: number; max_stake: number; profit_rate: number }) => {
      const { error } = await supabase.from('trade_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trade-rules'] }); toast.success(t('rules.ruleUpdated')); handleCloseDialog(); },
    onError: (error: any) => { toast.error(error.message || t('rules.failedUpdate')); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trade_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trade-rules'] }); toast.success(t('rules.ruleDeleted')); setIsDeleteDialogOpen(false); setDeletingRule(null); },
    onError: (error: any) => { toast.error(error.message || t('rules.failedDelete')); },
  });

  const handleOpenDialog = (rule?: TradeRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({ min_stake: rule.min_stake.toString(), max_stake: rule.max_stake.toString(), profit_rate: rule.profit_rate.toString() });
    } else {
      setEditingRule(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => { setIsDialogOpen(false); setEditingRule(null); setFormData(initialFormData); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const min_stake = parseFloat(formData.min_stake);
    const max_stake = parseFloat(formData.max_stake);
    const profit_rate = parseFloat(formData.profit_rate);
    if (isNaN(min_stake) || isNaN(max_stake) || isNaN(profit_rate)) { toast.error('Please enter valid numbers'); return; }
    if (min_stake >= max_stake) { toast.error('Min stake must be less than max stake'); return; }
    if (profit_rate <= 0 || profit_rate > 100) { toast.error('Profit rate must be between 0 and 100'); return; }
    if (editingRule) { updateMutation.mutate({ id: editingRule.id, min_stake, max_stake, profit_rate }); } 
    else { createMutation.mutate({ min_stake, max_stake, profit_rate }); }
  };

  const handleDelete = (rule: TradeRule) => { setDeletingRule(rule); setIsDeleteDialogOpen(true); };
  const confirmDelete = () => { if (deletingRule) { deleteMutation.mutate(deletingRule.id); } };

  if (authLoading) { return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }
  if (!isSuperAdmin) { return <Navigate to="/admin" replace />; }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('rules.title')}</h1>
        <Button onClick={() => handleOpenDialog()}><Plus className="mr-2 h-4 w-4" />{t('rules.addRule')}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('rules.allRules')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('rules.noRules')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('rules.minStake')}</TableHead>
                  <TableHead>{t('rules.maxStake')}</TableHead>
                  <TableHead>{t('rules.profitRate')}</TableHead>
                  <TableHead>{t('rules.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">${rule.min_stake.toFixed(2)}</TableCell>
                    <TableCell>${rule.max_stake.toFixed(2)}</TableCell>
                    <TableCell>{rule.profit_rate}%</TableCell>
                    <TableCell>{format(new Date(rule.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRule ? t('rules.editRule') : t('rules.addNewRule')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="min_stake">{t('rules.minStake')} ($)</Label>
              <Input id="min_stake" type="number" step="0.01" min="0" value={formData.min_stake} onChange={(e) => setFormData({ ...formData, min_stake: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_stake">{t('rules.maxStake')} ($)</Label>
              <Input id="max_stake" type="number" step="0.01" min="0" value={formData.max_stake} onChange={(e) => setFormData({ ...formData, max_stake: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profit_rate">{t('rules.profitRate')} (%)</Label>
              <Input id="profit_rate" type="number" step="0.1" min="0.1" max="100" value={formData.profit_rate} onChange={(e) => setFormData({ ...formData, profit_rate: e.target.value })} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingRule ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rules.deleteRule')}</AlertDialogTitle>
            <AlertDialogDescription>{t('rules.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
