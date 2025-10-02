import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notificationAudio } from '@/lib/NotificationAudio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, DollarSign, UserCheck, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  created_at: string;
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
          is_verified,
          created_at
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
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
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
                  <TableCell colSpan={7} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
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
                        {user.email}
                        {newUserIds.has(user.id) && (
                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">
                            NEW
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.first_name} {user.last_name}
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
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>User Details</DialogTitle>
                              <DialogDescription>
                                Complete information for {user.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Email</label>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Name</label>
                                  <p className="text-sm text-muted-foreground">
                                    {user.first_name} {user.last_name}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Balance</label>
                                  <p className="text-sm text-muted-foreground font-mono">
                                    ${user.balance?.toFixed(2) || '0.00'}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Total Trades</label>
                                  <p className="text-sm text-muted-foreground">{user.total_trades}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Status</label>
                                  <Badge variant={user.is_verified ? "default" : "secondary"}>
                                    {user.is_verified ? 'Verified' : 'Unverified'}
                                  </Badge>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Joined</label>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(user.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserVerification(user.user_id, user.is_verified)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;