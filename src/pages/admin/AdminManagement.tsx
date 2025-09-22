import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield, Users, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  assigned_invite_codes: string[];
}

interface InviteCode {
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
  const { isSuperAdmin, user } = useAuth();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [userInviteCodes, setUserInviteCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState('admin');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
      fetchInviteCodes();
    } else if (user) {
      fetchUserInviteCodes();
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
    }
  };

  const fetchInviteCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteCodes(data || []);
    } catch (error) {
      console.error('Error fetching invite codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInviteCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('assigned_invite_codes')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserInviteCodes(data?.assigned_invite_codes || []);
    } catch (error) {
      console.error('Error fetching user invite codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInviteCode = async () => {
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
        title: "Invite code created",
        description: "New admin invite code has been generated successfully.",
      });

      fetchInviteCodes();
    } catch (error) {
      console.error('Error creating invite code:', error);
      toast({
        title: "Error",
        description: "Failed to create invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard.",
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
        title: "Admin status updated",
        description: `Admin has been ${!currentStatus ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: "Failed to update admin status.",
        variant: "destructive",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Invite Codes</h1>
          <p className="text-muted-foreground">
            Share these codes with users to register and link them to your admin account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Invite Codes</span>
            </CardTitle>
            <CardDescription>
              These codes link new users to your admin account when they register
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : userInviteCodes.length > 0 ? (
              <div className="space-y-3">
                <Alert>
                  <AlertDescription>
                    Share these codes with users. When they register using one of these codes, they will be linked to your admin account and you'll be able to see their data in User Management, Messages, and Withdrawal Requests.
                  </AlertDescription>
                </Alert>
                {userInviteCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                        {code}
                      </code>
                      <p className="text-xs text-muted-foreground">
                        User registration invite code
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                    >
                      {copiedCode === code ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No invite codes assigned</p>
                <p className="text-sm">Contact a super admin to get user invite codes assigned to your account.</p>
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
        <h1 className="text-3xl font-bold text-foreground">Admin Management</h1>
        <p className="text-muted-foreground">
          Manage administrators and create invite codes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Administrators</span>
            </CardTitle>
            <CardDescription>
              All registered administrators and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No administrators found
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admin.role !== 'super_admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                          >
                            {admin.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Invite Codes</span>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Admin Invite Code</DialogTitle>
                    <DialogDescription>
                      Generate a new invite code for administrator registration
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Admin Role</Label>
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
                        Invite codes expire after 7 days and can only be used once.
                      </AlertDescription>
                    </Alert>
                    <Button onClick={createInviteCode} disabled={creating} className="w-full">
                      {creating ? 'Creating...' : 'Create Invite Code'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>
              Generate and manage admin invite codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inviteCodes.slice(0, 5).map((code) => (
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
              {inviteCodes.length === 0 && !loading && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No invite codes created yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminManagement;