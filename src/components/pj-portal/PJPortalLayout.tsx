import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePJPortalAccess, type PJTenantAccess } from "@/hooks/usePJPortalAccess";
import { PJPortalSidebar } from "./PJPortalSidebar";
import { PJTenantSelector } from "./PJTenantSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import PageLoader from "@/components/PageLoader";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Session context ────────────────────────────────────────────────────────

interface PJSessionContextType {
  tenantId: string;
  pjId: string;
  accessLevel: string;
  tenantName: string;
  allAccess: PJTenantAccess[];
  switchTenant: (access: PJTenantAccess) => void;
}

const PJSessionContext = createContext<PJSessionContextType | null>(null);

export function usePJSession(): PJSessionContextType {
  const ctx = useContext(PJSessionContext);
  if (!ctx) throw new Error("usePJSession must be used within PJPortalLayout");
  return ctx;
}

// ─── Storage key ─────────────────────────────────────────────────────────────

function storageKey(userId: string) {
  return `pj-portal-session-${userId}`;
}

function saveSession(userId: string, access: PJTenantAccess) {
  localStorage.setItem(storageKey(userId), JSON.stringify(access));
}

function loadSession(userId: string, accessList: PJTenantAccess[]): PJTenantAccess | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as PJTenantAccess;
    return accessList.find((a) => a.tenant_id === saved.tenant_id && a.pj_id === saved.pj_id) ?? null;
  } catch {
    return null;
  }
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function PJPortalLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isPJ, tenants, isLoading } = usePJPortalAccess();
  const navigate = useNavigate();

  const [activeAccess, setActiveAccess] = useState<PJTenantAccess | null>(null);

  // Auto-select tenant from localStorage or when there's only one
  useEffect(() => {
    if (!user || tenants.length === 0) return;

    const saved = loadSession(user.id, tenants);
    if (saved) {
      setActiveAccess(saved);
      return;
    }
    if (tenants.length === 1) {
      setActiveAccess(tenants[0]);
      saveSession(user.id, tenants[0]);
    }
    // Multiple tenants + no saved preference → show selector (activeAccess stays null)
  }, [user, tenants]);

  if (authLoading || isLoading) return <PageLoader />;

  // Not authenticated → go to login
  if (!user) return <Navigate to="/auth" replace />;

  // Authenticated but no PJ access → back to admin dashboard
  if (!isLoading && !isPJ) return <Navigate to="/dashboard" replace />;

  const switchTenant = (access: PJTenantAccess) => {
    if (user) saveSession(user.id, access);
    setActiveAccess(access);
    navigate("/portal/dashboard");
  };

  // Multiple tenants and none selected → tenant picker
  if (tenants.length > 1 && !activeAccess) {
    return (
      <PJTenantSelector
        tenants={tenants}
        onSelect={switchTenant}
        userEmail={user.email ?? ""}
        onSignOut={signOut}
      />
    );
  }

  // Still resolving the single-tenant auto-select
  if (!activeAccess) return <PageLoader />;

  return (
    <PJSessionContext.Provider
      value={{
        tenantId: activeAccess.tenant_id,
        pjId: activeAccess.pj_id,
        accessLevel: activeAccess.access_level,
        tenantName: activeAccess.tenant_name,
        allAccess: tenants,
        switchTenant,
      }}
    >
      <div className="min-h-screen flex w-full bg-background">
        <PJPortalSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-2 border-b border-border px-4 bg-card/50 shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="font-medium text-foreground">{activeAccess.tenant_name}</span>
              {tenants.length > 1 && (
                <button
                  onClick={() => setActiveAccess(null)}
                  className="text-xs underline text-muted-foreground hover:text-foreground ml-1"
                >
                  trocar
                </button>
              )}
            </div>
            <div className="flex-1" />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sair"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </PJSessionContext.Provider>
  );
}
