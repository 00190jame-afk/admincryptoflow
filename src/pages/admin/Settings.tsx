import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Save, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TradeRules {
  id?: string;
  min_stake: number;
  max_stake: number;
  profit_rate: number;
}

const Settings = () => {
  const [tradeRules, setTradeRules] = useState<TradeRules>({
    min_stake: 1,
    max_stake: 1000,
    profit_rate: 0.8
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTradeRules();
  }, []);

  const fetchTradeRules = async () => {
    try {
      const { data, error } = await supabase
        .from('trade_rules')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTradeRules({
          id: data.id,
          min_stake: data.min_stake,
          max_stake: data.max_stake,
          profit_rate: data.profit_rate
        });
      }
    } catch (error) {
      console.error('Error fetching trade rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTradeRules = async () => {
    setSaving(true);
    try {
      if (tradeRules.id) {
        // Update existing rules
        const { error } = await supabase
          .from('trade_rules')
          .update({
            min_stake: tradeRules.min_stake,
            max_stake: tradeRules.max_stake,
            profit_rate: tradeRules.profit_rate
          })
          .eq('id', tradeRules.id);

        if (error) throw error;
      } else {
        // Create new rules
        const { data, error } = await supabase
          .from('trade_rules')
          .insert([{
            min_stake: tradeRules.min_stake,
            max_stake: tradeRules.max_stake,
            profit_rate: tradeRules.profit_rate
          }])
          .select()
          .single();

        if (error) throw error;
        
        setTradeRules(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Settings saved",
        description: "Trade rules have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving trade rules:', error);
      toast({
        title: "Error",
        description: "Failed to save trade rules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof TradeRules, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setTradeRules(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Configure platform parameters and trading rules
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Trading Rules</span>
            </CardTitle>
            <CardDescription>
              Configure minimum and maximum stakes and profit rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minStake">Minimum Stake</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="minStake"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tradeRules.min_stake}
                    onChange={(e) => handleInputChange('min_stake', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStake">Maximum Stake</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="maxStake"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tradeRules.max_stake}
                    onChange={(e) => handleInputChange('max_stake', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profitRate">Profit Rate (Multiplier)</Label>
              <Input
                id="profitRate"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={tradeRules.profit_rate}
                onChange={(e) => handleInputChange('profit_rate', e.target.value)}
                placeholder="e.g., 0.8 for 80% profit"
              />
              <p className="text-xs text-muted-foreground">
                Winning trades will receive stake amount × profit rate as profit
              </p>
            </div>
            <Button onClick={saveTradeRules} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Trade Rules'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>System Information</span>
            </CardTitle>
            <CardDescription>
              Platform status and configuration details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Database Status</Label>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Connected and operational</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Authentication</Label>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Supabase Auth enabled</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Real-time Updates</Label>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">WebSocket connections active</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Status</Label>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">All endpoints operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Statistics</CardTitle>
          <CardDescription>
            Current platform configuration and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                ${tradeRules.min_stake.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Minimum Trade</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                ${tradeRules.max_stake.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Maximum Trade</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {(tradeRules.profit_rate * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Profit Rate</p>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {((1 + tradeRules.profit_rate) * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Win Payout</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;