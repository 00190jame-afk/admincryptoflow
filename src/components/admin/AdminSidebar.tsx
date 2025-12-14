import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  DollarSign,
  Shield,
  MessageSquare,
  CreditCard,
} from 'lucide-react';

const mainItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, countKey: null },
  { title: 'User Management', url: '/admin/users', icon: Users, countKey: 'users' as const },
  { title: 'Trade Management', url: '/admin/trades', icon: TrendingUp, countKey: 'trades' as const },
  { title: 'Messages', url: '/admin/messages', icon: MessageSquare, countKey: 'messages' as const },
  { title: 'Recharge Codes', url: '/admin/recharge', icon: CreditCard, countKey: 'rechargeCodes' as const },
  { title: 'User Balance', url: '/admin/balance', icon: DollarSign, countKey: 'balanceChanges' as const },
  { title: 'Withdrawal Requests', url: '/admin/withdrawals', icon: TrendingUp, countKey: 'withdrawals' as const },
];

const superAdminItems = [
  { title: 'Admin Management', url: '/admin/admins', icon: Shield },
];


export function AdminSidebar() {
  const { state } = useSidebar();
  const { isSuperAdmin } = useAuth();
  const { counts } = useNotifications();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) => {
    return isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50";
  };

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const count = item.countKey === null ? totalCount : counts[item.countKey];
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={`${getNavCls(item.url)} flex items-center justify-between`}>
                        <div className="flex items-center">
                          <item.icon className="mr-2 h-4 w-4" />
                          {state !== "collapsed" && <span>{item.title}</span>}
                        </div>
                        {count > 0 && state !== "collapsed" && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                            {count > 99 ? '99+' : count}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls(item.url)}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {state !== "collapsed" && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>
    </Sidebar>
  );
}
