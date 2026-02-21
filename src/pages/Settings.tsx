import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert } from "lucide-react";
import SettingsLayout, { type SettingsSection } from "./settings/SettingsLayout";
import CompanyGeneral from "./settings/CompanyGeneral";
import UsersManagement from "./settings/UsersManagement";
import ApiKeysManagement from "./settings/ApiKeysManagement";
import CustomFieldsSettings from "./settings/CustomFieldsSettings";
import AuditLogsView from "./settings/AuditLogsView";
import ProductCategories from "./settings/ProductCategories";
import WarehousesSettings from "./settings/WarehousesSettings";
import IntegrationsSettings from "./settings/IntegrationsSettings";

const SECTION_MAP: Record<SettingsSection, React.ComponentType> = {
  company: CompanyGeneral,
  users: UsersManagement,
  "api-keys": ApiKeysManagement,
  "custom-fields": CustomFieldsSettings,
  "audit-logs": AuditLogsView,
  categories: ProductCategories,
  warehouses: WarehousesSettings,
  integrations: IntegrationsSettings,
};

export default function Settings() {
  const { user } = useAuth();
  const [section, setSection] = useState<SettingsSection>("company");

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ShieldAlert className="h-12 w-12" />
        <p className="text-lg font-medium">Acesso restrito a administradores</p>
      </div>
    );
  }

  const ActiveComponent = SECTION_MAP[section];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua empresa, sistema e integrações</p>
      </div>
      <SettingsLayout activeSection={section} onSectionChange={setSection}>
        <ActiveComponent />
      </SettingsLayout>
    </div>
  );
}
