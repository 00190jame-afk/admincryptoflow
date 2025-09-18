import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminAuth from "./pages/AdminAuth";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import TradeManagement from "./pages/admin/TradeManagement";
import AdminManagement from "./pages/admin/AdminManagement";
import InviteCodeManagement from "./pages/admin/InviteCodeManagement";
import FinancialControls from "./pages/admin/FinancialControls";
import SecurityCenter from "./pages/admin/SecurityCenter";
import Settings from "./pages/admin/Settings";
import ContactMessages from "./pages/admin/ContactMessages";
import UserMessages from "./pages/admin/UserMessages";
import RechargeCodeManagement from "./pages/admin/RechargeCodeManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AdminAuth />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="trades" element={<TradeManagement />} />
              <Route path="admins" element={<AdminManagement />} />
              <Route path="messages" element={<UserMessages />} />
              <Route path="contact" element={<ContactMessages />} />
              <Route path="invites" element={<InviteCodeManagement />} />
              <Route path="recharge" element={<RechargeCodeManagement />} />
              <Route path="finance" element={<FinancialControls />} />
              <Route path="security" element={<SecurityCenter />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
