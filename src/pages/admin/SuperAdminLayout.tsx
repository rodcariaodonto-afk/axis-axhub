import { Navigate, Outlet, NavLink, useLocation } from "react-router-dom";
import { ShieldCheck, Building2, Users, BarChart3, FileText, Activity, DollarSign } from "lucide-react";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import PageLoader from "@/components/PageLoader";
import { Badge } from "@/components/ui/badge";

/**
 * Layout do modulo Super Admin.
 *
 * Guarda: somente usuarios em `public.super_admins` acessam.
 * Usuarios nao autorizados sao redirecionados para `/dashboard`.
 *
 * Estrutura: este componente eh renderizado DENTRO do AppLayout
 * (que ja fornece sidebar + header). Aqui adicionamos um sub-header
 * com tabs especificas do super admin e o Outlet para as paginas filhas.
 */
const ADMIN_TABS = [
  { to: "/admin/tenants", label: "Tenants", icon: Building2 },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/metrics", label: "Metricas", icon: BarChart3 },
  { to: "/admin/audit", label: "Auditoria", icon: FileText },
  { to: "/admin/health", label: "Saude", icon: Activity },
  { to: "/admin/billing", label: "Billing", icon: DollarSign },
];

export default function SuperAdminLayout() {
  const { isSuperAdmin, isLoading } = useIsSuperAdmin();
  const { user } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect /admin -> /admin/tenants
  if (location.pathname === "/admin" || location.pathname === "/admin/") {
    return <Navigate to="/admin/tenants" replace />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Super Admin</h1>
            <Badge variant="default" className="bg-primary/20 text-primary">
              AXHolding
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Logado como {user?.email}
          </span>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
