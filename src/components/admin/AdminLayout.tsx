import React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminDataProvider, useAdminDataContext } from '@/contexts/AdminDataContext';

const AdminLayoutContent = () => {
  const { isInitialLoading } = useAdminDataContext();

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1">
          <AdminHeader />
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const AdminLayout = () => {
  const { user, loading, isAdmin, signOut, adminStatusChecking } = useAuth();
  const navigate = useNavigate();

  const handleSwitchAccount = async () => {
    await signOut();
    navigate('/auth');
  };

  // Show loading while auth OR admin status is being checked
  if (loading || adminStatusChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <Button onClick={handleSwitchAccount}>
            Login with Admin Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminDataProvider>
      <AdminLayoutContent />
    </AdminDataProvider>
  );
};

export default AdminLayout;