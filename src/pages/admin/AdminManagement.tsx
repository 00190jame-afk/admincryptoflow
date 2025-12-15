import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notificationAudio } from '@/lib/NotificationAudio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield, Users, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  primary_invite_code: string | null;
}

interface InviteCode {
  id: string;
  code: string;
  current_uses: number;
  max_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  admin_name: string | null;
}

interface AdminInviteCode {
  id: string;
  code: string;
  role: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  used_by?: string;
  used_at?: string;
}

const AdminManagement = () => {
  const { t } = useTranslation();
  const { isSuperAdmin, user } = useAuth();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [adminInviteCodes, setAdminInviteCodes] = useState<AdminInviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState('admin');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newAdminIds, setNewAdminIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
      fetchInviteCodes();
      fetchAdminInviteCodes();
      
      // Set up real-time subscription for new admins
      const channel = supabase
        .channel('admin-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_profiles'
          },
          (payload) => {
            const newAdmin = payload.new as AdminProfile;
            setAdmins(prev => [newAdmin, ...prev]);
            setNewAdminIds(prev => new Set([...prev, newAdmin.id]));
            notificationAudio.play();
            
            setTimeout(() => {
              setNewAdminIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(newAdmin.id);
                return newSet;
              });
            }, 30000);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (user) {
      fetchInviteCodes();
    }
  }, [isSuperAdmin, user]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: t('common.error'),
        description: t('admin.failedCreateAdmin'),
        variant: "destructive",
      });
    }
  };

  const fetchInviteCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteCodes(data || []);
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      toast({
        title: t('common.error'),
        description: t('admin.failedCreateUser'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminInviteCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminInviteCodes(data || []);
    } catch (error) {
      console.error('Error fetching admin invite codes:', error);
    }
  };

  const createAdminInviteCode = async () => {
    setCreating(true);
    try {
      // Generate a random 8-character code
      const characters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      const code = Array.from({ length: 8 }, () => 
        characters.charAt(Math.floor(Math.random() * characters.length))
      ).join('');

      const { data, error } = await supabase
        .from('admin_invite_codes')
        .insert([
          {
            code: code,
            role: newInviteRole,
            is_active: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('admin.adminCodeCreated'),
      });

      fetchAdminInviteCodes();
    } catch (error) {
      console.error('Error creating admin invite code:', error);
      toast({
        title: t('common.error'),
        description: t('admin.failedCreateAdmin'),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const createUserInviteCode = async (adminName: string) => {
    if (!user) return;
    
    try {
      // Use the generate_invite_code function to create a unique code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) throw codeError;
      
      // Create the invite code
      const { error } = await supabase
        .from('invite_codes')
        .insert({
          code: codeResult,
          created_by: user.id,
          max_uses: 100,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          admin_name: adminName
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('admin.userCodeCreated'),
      });

      // Refresh data
      await fetchInviteCodes();
    } catch (error) {
      console.error('Error creating user invite code:', error);
      toast({
        title: t('common.error'),
        description: t('admin.failedCreateUser'),
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: t('recharge.copy'),
        description: t('recharge.copied'),
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', adminId);

      if (error) throw error;
      
      fetchAdmins();
      toast({
        title: t('common.success'),
        description: t('admin.statusUpdated'),
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: t('common.error'),
        description: t('admin.failedUpdateStatus'),
        variant: "destructive",
      });
    }
  };

  if (!isSuperAdmin) {
    const myCode = inviteCodes.find(code => code.created_by === user?.id);
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('admin.yourInviteCode')}</h1>
          <p className="text-muted-foreground">
            {t('admin.shareCode')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{t('admin.userInviteCode')}</span>
            </CardTitle>
            <CardDescription>
              {t('admin.shareCode')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">{t('common.loading')}</div>
            ) : myCode ? (
              <div className="space-y-3">
                <Alert>
                  <AlertDescription>
                    {t('admin.shareCode')}
                  </AlertDescription>
                </Alert>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                  <div className="space-y-1">
                    <code className="text-lg font-mono bg-background px-3 py-2 rounded">
                      {myCode.code}
                    </code>
                    <p className="text-sm text-muted-foreground">
                      Used {myCode.current_uses}/{myCode.max_uses} times
                      {myCode.expires_at && (
                        <>
                          {' • '}Expires {new Date(myCode.expires_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(myCode.code)}
                  >
                    {copiedCode === myCode.code ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t('admin.noAdmins')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('admin.title')}</h1>
        <p className="text-muted-foreground">
          {t('admin.description')}
        </p>
      </div>

      {/* Admin Profiles with User Invite Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>{t('admin.allAdmins')}</span>
          </CardTitle>
          <CardDescription>
            {t('admin.manageAdmins')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('admin.role')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('admin.userInviteCode')}</TableHead>
                <TableHead>Code Usage</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {t('admin.loadingAdmins')}
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {t('admin.noAdmins')}
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => {
                  const adminCode = inviteCodes.find(code => code.created_by === admin.user_id);
                  return (
                    <TableRow 
                      key={admin.id}
                      className={newAdminIds.has(admin.id) ? "bg-red-50 dark:bg-red-950/20 animate-in fade-in duration-500" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {admin.full_name || admin.email}
                          {newAdminIds.has(admin.id) && (
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">
                              NEW
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                          {admin.role === 'super_admin' ? t('header.superAdmin') : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.is_active ? 'default' : 'destructive'}>
                          {admin.is_active ? t('admin.active') : t('admin.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {adminCode ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{adminCode.code}</code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(adminCode.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => createUserInviteCode(admin.full_name || admin.email)}
                          >
                            {t('admin.createUserCode')}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {adminCode ? (
                          <span className="text-sm text-muted-foreground">
                            {adminCode.current_uses}/{adminCode.max_uses}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No code</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {admin.role !== 'super_admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                          >
                            {admin.is_active ? t('admin.deactivate') : t('admin.activate')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Admin Invite Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{t('admin.adminInviteCodes')}</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('admin.createAdminCode')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('admin.createNewAdminCode')}</DialogTitle>
                  <DialogDescription>
                    {t('admin.adminCodeDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">{t('admin.role')}</Label>
                    <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Alert>
                    <AlertDescription>
                      Admin invite codes expire after 7 days and can only be used once.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={createAdminInviteCode} disabled={creating} className="w-full">
                    {creating ? 'Creating...' : 'Create Admin Invite Code'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Codes for creating new admin accounts (different from user registration codes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {adminInviteCodes.slice(0, 5).map((code) => (
              <div key={code.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {code.code}
                    </code>
                    <Badge variant={code.role === 'super_admin' ? 'default' : 'secondary'}>
                      {code.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {code.used_by ? 'Used' : 'Available'} • Expires {new Date(code.expires_at || '').toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(code.code)}
                  disabled={!!code.used_by}
                >
                  {copiedCode === code.code ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
            {adminInviteCodes.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No admin invite codes created yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagement;