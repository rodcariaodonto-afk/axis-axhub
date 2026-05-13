import { useState } from "react";
import { Building2, Users, Key, Settings2, ScrollText, Tag, Warehouse, Plug, UserCircle, Bell, FileText, ListChecks, Receipt, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsSection =
  | "profile"
  | "notifications"
  | "company"
  | "fiscal"
  | "users"
  | "api-keys"
  | "custom-fields"
  | "generic-custom-fields"
  | "audit-logs"
  | "categories"
  | "warehouses"
  | "integrations"
  | "templates"
  | "data-governance";

interface MenuItem {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "PERFIL",
    items: [
      { id: "profile", label: "Meu Perfil", icon: UserCircle },
      { id: "notifications", label: "Notificações", icon: Bell },
    ],
  },
  {
    title: "EMPRESA",
    items: [{ id: "company", label: "Geral", icon: Building2 }],
  },
  {
    title: "FISCAL",
    items: [{ id: "fiscal", label: "Fiscal (NF-e/NFS-e)", icon: Receipt }],
  },
  {
    title: "SISTEMA",
    items: [
      { id: "users", label: "Usuários", icon: Users },
      { id: "api-keys", label: "Chaves de API", icon: Key },
      { id: "custom-fields", label: "Campos (Produtos)", icon: Settings2 },
      { id: "generic-custom-fields", label: "Campos (CRM)", icon: ListChecks },
      { id: "audit-logs", label: "Logs de Auditoria", icon: ScrollText },
    ],
  },
  {
    title: "CADASTROS",
    items: [{ id: "categories", label: "Categorias de Produtos", icon: Tag }],
  },
  {
    title: "SUPRIMENTOS",
    items: [{ id: "warehouses", label: "Depósitos", icon: Warehouse }],
  },
  {
    title: "COMUNICAÇÃO",
    items: [{ id: "templates", label: "Templates", icon: FileText }],
  },
  {
    title: "INTEGRAÇÕES",
    items: [{ id: "integrations", label: "Integrações", icon: Plug }],
  },
];

interface SettingsLayoutProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  children: React.ReactNode;
}

export type { SettingsSection };

export default function SettingsLayout({ activeSection, onSectionChange, children }: SettingsLayoutProps) {
  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 space-y-5">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground mb-2">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
