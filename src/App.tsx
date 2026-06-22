import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";

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
const DRE = lazy(() => import("./pages/DRE"));
const BalancoPatrimonial = lazy(() => import("./pages/BalancoPatrimonial"));
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
const Forms = lazy(() => import("./pages/Forms"));
const FormEditor = lazy(() => import("./pages/FormEditor"));
const FormResponses = lazy(() => import("./pages/FormResponses"));
const PublicForm = lazy(() => import("./pages/PublicForm"));
const ContractTemplates = lazy(() => import("./pages/ContractTemplates"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Iris = lazy(() => import("./pages/Iris"));
const FiscalInvoices = lazy(() => import("./pages/erp/FiscalInvoices"));
const NotFound = lazy(() => import("./pages/NotFound"));

// PJ Management — admin pages
const ContractVigency = lazy(() => import("./pages/ContractVigency"));
const Repasses = lazy(() => import("./pages/Repasses"));
const NFApprovals = lazy(() => import("./pages/NFApprovals"));
const NFApprovalDetail = lazy(() => import("./pages/NFApprovalDetail"));
const PJDocuments = lazy(() => import("./pages/PJDocuments"));
const TaxManagement = lazy(() => import("./pages/TaxManagement"));
const BankManagement = lazy(() => import("./pages/BankManagement"));
const PJRanking = lazy(() => import("./pages/PJRanking"));
const ApiManagement = lazy(() => import("./pages/ApiManagement"));

// PJ Portal module (layout 100% separado do admin)
const PJPortalLayout = lazy(() => import("./components/pj-portal/PJPortalLayout"));
const PJPortalDashboard = lazy(() => import("./components/pj-portal/PJPortalDashboard"));
const PJContractsList = lazy(() => import("./components/pj-portal/PJContractsList"));
const PJRepassesList = lazy(() => import("./components/pj-portal/PJRepassesList"));
const PJDocumentUpload = lazy(() => import("./components/pj-portal/PJDocumentUpload"));
const PJNotificationsList = lazy(() => import("./components/pj-portal/PJNotificationsList"));
const PJNFUpload = lazy(() => import("./components/pj-portal/PJNFUpload"));
const PJBankData = lazy(() => import("./components/pj-portal/PJBankData"));
const PJScoreView = lazy(() => import("./components/pj-portal/PJScoreView"));

// Super Admin module (AXHolding internal)
const SuperAdminLayout = lazy(() => import("./pages/admin/SuperAdminLayout"));
const AdminTenants = lazy(() => import("./pages/admin/AdminTenants"));
const AdminTenantDetail = lazy(() => import("./pages/admin/AdminTenantDetail"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminMetrics = lazy(() => import("./pages/admin/AdminMetrics"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminHealth = lazy(() => import("./pages/admin/AdminHealth"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));

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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
              <Route path="/dre" element={<ProtectedRoute><DRE /></ProtectedRoute>} />
              <Route path="/balanco-patrimonial" element={<ProtectedRoute><BalancoPatrimonial /></ProtectedRoute>} />
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
              <Route path="/contract-templates" element={<ProtectedRoute><ContractTemplates /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
              <Route path="/accounts/:id" element={<ProtectedRoute><AccountDetail /></ProtectedRoute>} />
              <Route path="/funis" element={<ProtectedRoute><Funis /></ProtectedRoute>} />
              <Route path="/funis/:id" element={<ProtectedRoute><FunilEditor /></ProtectedRoute>} />
              <Route path="/internal-chat" element={<ProtectedRoute><InternalChat /></ProtectedRoute>} />
              <Route path="/business-intelligence" element={<ProtectedRoute><BusinessIntelligence /></ProtectedRoute>} />
              <Route path="/opportunities" element={<ProtectedRoute><Opportunities /></ProtectedRoute>} />
              <Route path="/opportunities/:id" element={<ProtectedRoute><OpportunityDetail /></ProtectedRoute>} />
              <Route path="/forms" element={<ProtectedRoute><Forms /></ProtectedRoute>} />
              <Route path="/forms/:id/edit" element={<ProtectedRoute><FormEditor /></ProtectedRoute>} />
              <Route path="/forms/:id/responses" element={<ProtectedRoute><FormResponses /></ProtectedRoute>} />
              <Route path="/form/:code" element={<PublicForm />} />
              <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/iris" element={<ProtectedRoute><Iris /></ProtectedRoute>} />
              <Route path="/erp/notas-fiscais" element={<ProtectedRoute><FiscalInvoices /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              <Route path="/contracts/vigency" element={<ProtectedRoute><ContractVigency /></ProtectedRoute>} />
              <Route path="/repasses" element={<ProtectedRoute><Repasses /></ProtectedRoute>} />
              <Route path="/nf-approvals" element={<ProtectedRoute><NFApprovals /></ProtectedRoute>} />
              <Route path="/nf-approvals/:id" element={<ProtectedRoute><NFApprovalDetail /></ProtectedRoute>} />
              <Route path="/pj-documents" element={<ProtectedRoute><PJDocuments /></ProtectedRoute>} />
              <Route path="/tax-management" element={<ProtectedRoute><TaxManagement /></ProtectedRoute>} />
              <Route path="/bank-management" element={<ProtectedRoute><BankManagement /></ProtectedRoute>} />
              <Route path="/pj-ranking" element={<ProtectedRoute><PJRanking /></ProtectedRoute>} />
              <Route path="/api-management" element={<ProtectedRoute><ApiManagement /></ProtectedRoute>} />

              {/* PJ Portal — layout separado, guards internos no PJPortalLayout */}
              <Route path="/portal" element={<PJPortalLayout />}>
                <Route index element={<Navigate to="/portal/dashboard" replace />} />
                <Route path="dashboard" element={<PJPortalDashboard />} />
                <Route path="contratos" element={<PJContractsList />} />
                <Route path="repasses" element={<PJRepassesList />} />
                <Route path="documentos" element={<PJDocumentUpload />} />
                <Route path="notificacoes" element={<PJNotificationsList />} />
                <Route path="notas-fiscais" element={<PJNFUpload />} />
                <Route path="dados-bancarios" element={<PJBankData />} />
                <Route path="avaliacao" element={<PJScoreView />} />
              </Route>

              {/* Super Admin module - guard interno via useIsSuperAdmin */}
              <Route path="/admin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminTenants />} />
                <Route path="tenants" element={<AdminTenants />} />
                <Route path="tenants/:id" element={<AdminTenantDetail />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="metrics" element={<AdminMetrics />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="health" element={<AdminHealth />} />
                <Route path="billing" element={<AdminBilling />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
