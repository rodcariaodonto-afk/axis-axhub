import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import Purchases from "./pages/Purchases";
import Receivables from "./pages/Receivables";
import Payables from "./pages/Payables";
import BankAccounts from "./pages/BankAccounts";
import Finance from "./pages/Finance";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import DealDetail from "./pages/DealDetail";
import Activities from "./pages/Activities";
import FunnelReport from "./pages/FunnelReport";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import NotificationPreferences from "./pages/NotificationPreferences";
import Contacts from "./pages/Contacts";
import Proposals from "./pages/Proposals";
import CrmDashboard from "./pages/CrmDashboard";
import Cadences from "./pages/Cadences";
import Forecasting from "./pages/Forecasting";
import Documentation from "./pages/Documentation";
import DocumentationArticle from "./pages/DocumentationArticle";
import DocumentationAdmin from "./pages/DocumentationAdmin";
import Settings from "./pages/Settings";
import Workflows from "./pages/Workflows";
import WhatsApp from "./pages/WhatsApp";
import Campanhas from "./pages/Campanhas";
import Funis from "./pages/Funis";
import FunilEditor from "./pages/FunilEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="/receivables" element={<ProtectedRoute><Receivables /></ProtectedRoute>} />
            <Route path="/payables" element={<ProtectedRoute><Payables /></ProtectedRoute>} />
            <Route path="/bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/deals/:id" element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
            <Route path="/funnel-report" element={<ProtectedRoute><FunnelReport /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
            <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
            <Route path="/crm-dashboard" element={<ProtectedRoute><CrmDashboard /></ProtectedRoute>} />
            <Route path="/cadences" element={<ProtectedRoute><Cadences /></ProtectedRoute>} />
            <Route path="/forecasting" element={<ProtectedRoute><Forecasting /></ProtectedRoute>} />
            <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            <Route path="/documentation/admin" element={<ProtectedRoute><DocumentationAdmin /></ProtectedRoute>} />
            <Route path="/documentation/:slug" element={<ProtectedRoute><DocumentationArticle /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/notification-preferences" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
            <Route path="/workflows" element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
            <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
            <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
            <Route path="/funis" element={<ProtectedRoute><Funis /></ProtectedRoute>} />
            <Route path="/funis/:id" element={<ProtectedRoute><FunilEditor /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
