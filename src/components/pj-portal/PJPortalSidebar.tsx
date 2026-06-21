import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  FolderOpen,
  Bell,
  User,
  FileCheck,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePJSession } from "./PJPortalLayout";
import axisLogo from "@/assets/axis-logo.svg";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard",     to: "/portal/dashboard",      icon: LayoutDashboard },
  { label: "Contratos",     to: "/portal/contratos",      icon: FileText },
  { label: "Repasses",      to: "/portal/repasses",       icon: DollarSign },
  { label: "Documentos",    to: "/portal/documentos",     icon: FolderOpen },
  { label: "Notas Fiscais",   to: "/portal/notas-fiscais",   icon: FileCheck },
  { label: "Dados Bancários", to: "/portal/dados-bancarios", icon: Building2 },
  { label: "Notificações",    to: "/portal/notificacoes",    icon: Bell, badge: true },
  { label: "Perfil",          to: "/portal/perfil",          icon: User },
];

export function PJPortalSidebar() {
  const { tenantId, pjId } = usePJSession();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["pj-unread-notifications", tenantId, pjId],
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("pj_notifications")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("pj_id", pjId)
        .eq("is_read", false);

      if (error) return 0;
      return count ?? 0;
    },
  });

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-card">
      <div className="h-14 flex items-center px-4 border-b border-border">
        <img src={axisLogo} alt="AXIS" className="h-6 w-auto" />
        <span className="ml-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          Portal PJ
        </span>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, to, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
