import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { notificationAudio } from '@/lib/NotificationAudio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Eye, Globe, Wallet, Monitor } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface User {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  credit_score: number | null;
  wallet_address: string | null;
  ip_address: string | null;
  ip_country: string | null;
  user_agent: string | null;
  created_at: string;
}

const UserManagement = () => {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserIds, setNewUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
    
    const channel = supabase.channel('profiles-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const newUser = payload.new as User;
        setUsers(prev => [newUser, ...prev]);
        setNewUserIds(prev => new Set([...prev, newUser.id]));
        notificationAudio.play();
        setTimeout(() => {
          setNewUserIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(newUser.id);
            return newSet;
          });
        }, 30000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUsers = async () => {
    try {
      let profilesQuery = supabase.from('profiles').select('id, user_id, email, username, credit_score, wallet_address, ip_address, ip_country, user_agent, created_at');

      if (!isSuperAdmin) {
        const { data: assignedUsers } = await supabase.rpc('get_admin_assigned_users', { p_admin_user_id: (await supabase.auth.getUser()).data.user?.id });
        if (assignedUsers && assignedUsers.length > 0) {
          profilesQuery = profilesQuery.in('user_id', assignedUsers.map((u: any) => u.user_id));
        } else {
          setUsers([]);
          setLoading(false);
          return;
        }
      }

      const { data: profiles, error } = await profilesQuery.order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ip_country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const truncateAddress = (address: string | null, length: number = 6) => {
    if (!address) return '-';
    if (address.length <= length * 2) return address;
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  };

  const truncateUserAgent = (ua: string | null, length: number = 30) => {
    if (!ua) return '-';
    if (ua.length <= length) return ua;
    return `${ua.slice(0, length)}...`;
  };

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm">{value || '-'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
        <p className="text-muted-foreground">{t('users.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('users.allUsers')}</CardTitle>
          <CardDescription>{t('users.searchManageUsers')}</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('users.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-md" />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('users.username')}</TableHead>
                  <TableHead>{t('users.creditScore')}</TableHead>
                  <TableHead>{t('users.wallet')}</TableHead>
                  <TableHead>{t('users.ipAddress')}</TableHead>
                  <TableHead>{t('users.country')}</TableHead>
                  <TableHead>{t('users.userAgent')}</TableHead>
                  <TableHead>{t('users.joined')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center">{t('users.loadingUsers')}</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center">{t('users.noUsers')}</TableCell></TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={newUserIds.has(user.id) ? "bg-red-50 dark:bg-red-950/20 animate-in fade-in duration-500" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="max-w-[180px] truncate">{user.email || '-'}</span>
                          {newUserIds.has(user.id) && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">{t('common.new')}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{user.username || '-'}</TableCell>
                      <TableCell><span className="font-mono">{user.credit_score ?? '-'}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.wallet_address ? <><Wallet className="h-3 w-3 text-muted-foreground" /><span className="text-sm font-mono">{truncateAddress(user.wallet_address)}</span></> : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.ip_address ? <><Monitor className="h-3 w-3 text-muted-foreground" /><span className="text-sm font-mono">{user.ip_address}</span></> : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.ip_country ? <><Globe className="h-3 w-3 text-muted-foreground" /><span className="text-sm">{user.ip_country}</span></> : '-'}
                        </div>
                      </TableCell>
                      <TableCell><span className="text-xs text-muted-foreground max-w-[150px] truncate block">{truncateUserAgent(user.user_agent)}</span></TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}><Eye className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{t('users.userDetails')}</DialogTitle>
                              <DialogDescription>{t('users.completeInfo')} {user.email}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-sm font-semibold mb-3 text-primary">{t('users.accountInfo')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <DetailRow label={t('common.email')} value={user.email} />
                                  <DetailRow label={t('users.username')} value={user.username} />
                                  <DetailRow label={t('users.creditScore')} value={user.credit_score} />
                                  <DetailRow label={t('users.joined')} value={new Date(user.created_at).toLocaleString()} />
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <h4 className="text-sm font-semibold mb-3 text-primary">{t('users.walletLocation')}</h4>
                                <div className="grid grid-cols-1 gap-4">
                                  <DetailRow label={t('users.walletAddress')} value={user.wallet_address ? <span className="font-mono text-xs break-all">{user.wallet_address}</span> : null} />
                                  <DetailRow label={t('users.ipAddress')} value={user.ip_address ? <span className="font-mono">{user.ip_address}</span> : null} />
                                  <DetailRow label={t('users.country')} value={user.ip_country} />
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <h4 className="text-sm font-semibold mb-3 text-primary">{t('users.technical')}</h4>
                                <DetailRow label={t('users.userAgent')} value={user.user_agent ? <span className="text-xs break-all">{user.user_agent}</span> : null} />
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
