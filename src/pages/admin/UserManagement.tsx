import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notificationAudio } from '@/lib/NotificationAudio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, UserCheck, UserX, Phone, Globe, Wallet, Monitor } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface User {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  is_verified: boolean | null;
  role: string | null;
  credit_score: number | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  balance?: number;
  total_trades?: number;
}

const UserManagement = () => {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserIds, setNewUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
    
    // Set up real-time subscription for new users
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          // New user profile created
          const newUser = payload.new as any;
          
          // Add to users list and mark as new
          setUsers(prev => [newUser, ...prev]);
          setNewUserIds(prev => new Set([...prev, newUser.id]));
          
          // Play notification sound
          notificationAudio.play();
          
          // Auto-remove highlight after 30 seconds
          setTimeout(() => {
            setNewUserIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(newUser.id);
              return newSet;
            });
          }, 30000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      let profilesQuery = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          email,
          first_name,
          last_name,
          phone,
          date_of_birth,
          address,
          city,
          country,
          postal_code,
          is_verified,
          role,
          credit_score,
          username,
          full_name,
          avatar_url,
          wallet_address,
          ip_address,
          user_agent,
          created_at,
          updated_at
        `);

      // If not super admin, filter to only assigned users
      if (!isSuperAdmin) {
        const { data: assignedUsers } = await supabase
          .rpc('get_admin_assigned_users', { 
            p_admin_user_id: (await supabase.auth.getUser()).data.user?.id 
          });
        
        if (assignedUsers && assignedUsers.length > 0) {
          const userIds = assignedUsers.map((u: any) => u.user_id);
          profilesQuery = profilesQuery.in('user_id', userIds);
        } else {
          // If no assigned users, return empty array
          setUsers([]);
          setLoading(false);
          return;
        }
      }

      const { data: profiles, error } = await profilesQuery
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch balances and trade counts for each user
      const usersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const [balanceResult, tradesResult] = await Promise.all([
            supabase
              .from('user_balances')
              .select('balance')
              .eq('user_id', profile.user_id)
              .single(),
            supabase
              .from('trades')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', profile.user_id)
          ]);

          return {
            ...profile,
            balance: balanceResult.data?.balance || 0,
            total_trades: tradesResult.count || 0,
          };
        })
      );

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;
      
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user verification:', error);
    }
  };

  const truncateAddress = (address: string | null, length: number = 8) => {
    if (!address) return '-';
    if (address.length <= length * 2) return address;
    return `${address.slice(0, length)}...${address.slice(-length)}`;
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
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">
          Manage and monitor platform users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Search and manage registered users
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, phone, country, wallet or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id}
                      className={newUserIds.has(user.id) ? "bg-red-50 dark:bg-red-950/20 animate-in fade-in duration-500" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="max-w-[180px] truncate">{user.email || '-'}</span>
                          {newUserIds.has(user.id) && (
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">
                              NEW
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.first_name || user.last_name 
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.phone ? (
                            <>
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{user.phone}</span>
                            </>
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.country ? (
                            <>
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{user.country}</span>
                            </>
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.wallet_address ? (
                            <>
                              <Wallet className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-mono">{truncateAddress(user.wallet_address, 6)}</span>
                            </>
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.ip_address ? (
                            <>
                              <Monitor className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-mono">{user.ip_address}</span>
                            </>
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">${user.balance?.toFixed(2) || '0.00'}</span>
                      </TableCell>
                      <TableCell>{user.total_trades}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_verified ? "default" : "secondary"}>
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                                <DialogDescription>
                                  Complete information for {user.email}
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh] pr-4">
                                <div className="space-y-6">
                                  {/* Personal Information */}
                                  <div>
                                    <h4 className="text-sm font-semibold mb-3 text-primary">Personal Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                      <DetailRow label="Email" value={user.email} />
                                      <DetailRow label="First Name" value={user.first_name} />
                                      <DetailRow label="Last Name" value={user.last_name} />
                                      <DetailRow label="Username" value={user.username} />
                                      <DetailRow label="Phone" value={user.phone} />
                                      <DetailRow label="Date of Birth" value={user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : null} />
                                    </div>
                                  </div>
                                  
                                  <Separator />
                                  
                                  {/* Location */}
                                  <div>
                                    <h4 className="text-sm font-semibold mb-3 text-primary">Location</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                      <DetailRow label="Address" value={user.address} />
                                      <DetailRow label="City" value={user.city} />
                                      <DetailRow label="Country" value={user.country} />
                                      <DetailRow label="Postal Code" value={user.postal_code} />
                                    </div>
                                  </div>
                                  
                                  <Separator />
                                  
                                  {/* Account */}
                                  <div>
                                    <h4 className="text-sm font-semibold mb-3 text-primary">Account</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                      <DetailRow label="Balance" value={<span className="font-mono">${user.balance?.toFixed(2) || '0.00'}</span>} />
                                      <DetailRow label="Total Trades" value={user.total_trades} />
                                      <DetailRow label="Status" value={
                                        <Badge variant={user.is_verified ? "default" : "secondary"}>
                                          {user.is_verified ? 'Verified' : 'Unverified'}
                                        </Badge>
                                      } />
                                      <DetailRow label="Role" value={user.role} />
                                      <DetailRow label="Credit Score" value={user.credit_score} />
                                    </div>
                                  </div>
                                  
                                  <Separator />
                                  
                                  {/* Technical */}
                                  <div>
                                    <h4 className="text-sm font-semibold mb-3 text-primary">Technical Information</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                      <DetailRow label="Wallet Address" value={
                                        user.wallet_address ? (
                                          <span className="font-mono text-xs break-all">{user.wallet_address}</span>
                                        ) : null
                                      } />
                                      <DetailRow label="IP Address" value={
                                        user.ip_address ? (
                                          <span className="font-mono">{user.ip_address}</span>
                                        ) : null
                                      } />
                                      <DetailRow label="User Agent" value={
                                        user.user_agent ? (
                                          <span className="text-xs break-all">{user.user_agent}</span>
                                        ) : null
                                      } />
                                    </div>
                                  </div>
                                  
                                  <Separator />
                                  
                                  {/* Timestamps */}
                                  <div>
                                    <h4 className="text-sm font-semibold mb-3 text-primary">Timestamps</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <DetailRow label="Joined" value={new Date(user.created_at).toLocaleString()} />
                                      <DetailRow label="Last Updated" value={new Date(user.updated_at).toLocaleString()} />
                                    </div>
                                  </div>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserVerification(user.user_id, user.is_verified || false)}
                          >
                            {user.is_verified ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
