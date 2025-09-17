import React from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/contexts/NotificationContext';
import { Separator } from '@/components/ui/separator';

export const NotificationControls = () => {
  const { counts, isEnabled, volume, setEnabled, setVolume, markAsRead } = useNotifications();

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {totalCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalCount > 99 ? '99+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Notifications</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEnabled(!isEnabled)}
              className="text-xs"
            >
              {isEnabled ? <Bell className="h-3 w-3 mr-1" /> : <BellOff className="h-3 w-3 mr-1" />}
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">New Trades</span>
              <div className="flex items-center gap-2">
                {counts.trades > 0 && (
                  <Badge variant="secondary">{counts.trades}</Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAsRead('trades')}
                  className="text-xs h-6 px-2"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Withdrawals</span>
              <div className="flex items-center gap-2">
                {counts.withdrawals > 0 && (
                  <Badge variant="secondary">{counts.withdrawals}</Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAsRead('withdrawals')}
                  className="text-xs h-6 px-2"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Contact Messages</span>
              <div className="flex items-center gap-2">
                {counts.contactMessages > 0 && (
                  <Badge variant="secondary">{counts.contactMessages}</Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAsRead('contactMessages')}
                  className="text-xs h-6 px-2"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">User Messages</span>
              <div className="flex items-center gap-2">
                {counts.userMessages > 0 && (
                  <Badge variant="secondary">{counts.userMessages}</Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAsRead('userMessages')}
                  className="text-xs h-6 px-2"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {isEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span className="text-sm">Volume</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={([value]) => setVolume(value)}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};