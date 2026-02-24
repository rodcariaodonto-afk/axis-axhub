import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

const Products = lazy(() => import("./pages/Products"));
const Stock = lazy(() => import("./pages/Stock"));
const Customers = lazy(() => import("./pages/Customers"));
const Orders = lazy(() => import("./pages/Orders"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Receivables = lazy(() => import("./pages/Receivables"));
const Payables = lazy(() => import("./pages/Payables"));
const BankAccounts = lazy(() => import("./pages/BankAccounts"));
const Finance = lazy(() => import("./pages/Finance"));
const Leads = lazy(() => import("./pages/Leads"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const Activities = lazy(() => import("./pages/Activities"));
const ActivityDetail = lazy(() => import("./pages/ActivityDetail"));
const FunnelReport = lazy(() => import("./pages/FunnelReport"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportBuilderPage = lazy(() => import("./pages/ReportBuilderPage"));
const ReportViewPage = lazy(() => import("./pages/ReportViewPage"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Proposals = lazy(() => import("./pages/Proposals"));
const CrmDashboard = lazy(() => import("./pages/CrmDashboard"));
const Cadences = lazy(() => import("./pages/Cadences"));
const Forecasting = lazy(() => import("./pages/Forecasting"));
const Documentation = lazy(() => import("./pages/Documentation"));
const DocumentationArticle = lazy(() => import("./pages/DocumentationArticle"));
const DocumentationAdmin = lazy(() => import("./pages/DocumentationAdmin"));
const Settings = lazy(() => import("./pages/Settings"));
const Workflows = lazy(() => import("./pages/Workflows"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Campanhas = lazy(() => import("./pages/Campanhas"));
const Contracts = lazy(() => import("./pages/Contracts"));
const ContractDetail = lazy(() => import("./pages/ContractDetail"));
const Accounts = lazy(() => import("./pages/Accounts"));
const AccountDetail = lazy(() => import("./pages/AccountDetail"));
const Funis = lazy(() => import("./pages/Funis"));
const FunilEditor = lazy(() => import("./pages/FunilEditor"));
const InternalChat = lazy(() => import("./pages/InternalChat"));
const BusinessIntelligence = lazy(() => import("./pages/BusinessIntelligence"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
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
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/activities/:id" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
              <Route path="/funnel-report" element={<ProtectedRoute><FunnelReport /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/reports/:id/builder" element={<ProtectedRoute><ReportBuilderPage /></ProtectedRoute>} />
              <Route path="/reports/:id/view" element={<ProtectedRoute><ReportViewPage /></ProtectedRoute>} />
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
              <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
              <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
              <Route path="/accounts/:id" element={<ProtectedRoute><AccountDetail /></ProtectedRoute>} />
              <Route path="/funis" element={<ProtectedRoute><Funis /></ProtectedRoute>} />
              <Route path="/funis/:id" element={<ProtectedRoute><FunilEditor /></ProtectedRoute>} />
              <Route path="/internal-chat" element={<ProtectedRoute><InternalChat /></ProtectedRoute>} />
              <Route path="/business-intelligence" element={<ProtectedRoute><BusinessIntelligence /></ProtectedRoute>} />
              <Route path="/opportunities" element={<ProtectedRoute><Opportunities /></ProtectedRoute>} />
              <Route path="/opportunities/:id" element={<ProtectedRoute><OpportunityDetail /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
