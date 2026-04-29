import { useState } from "react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ShieldAlert } from "lucide-react";
import SettingsLayout, { type SettingsSection } from "./settings/SettingsLayout";
import ProfileSettings from "./settings/ProfileSettings";
import CompanyGeneral from "./settings/CompanyGeneral";
import UsersManagement from "./settings/UsersManagement";
import ApiKeysManagement from "./settings/ApiKeysManagement";
import CustomFieldsSettings from "./settings/CustomFieldsSettings";
import AuditLogsView from "./settings/AuditLogsView";
import ProductCategories from "./settings/ProductCategories";
import WarehousesSettings from "./settings/WarehousesSettings";
import IntegrationsSettings from "./settings/IntegrationsSettings";
import MessageTemplatesSettings from "./settings/MessageTemplatesSettings";
import GenericCustomFieldsSettings from "./settings/GenericCustomFieldsSettings";
import NotificationPreferences from "./NotificationPreferences";
import FiscalSettings from "./settings/FiscalSettings";

const SECTION_MAP: Record<SettingsSection, React.ComponentType> = {
  profile: ProfileSettings,
  notifications: NotificationPreferences,
  company: CompanyGeneral,
  fiscal: FiscalSettings,
  users: UsersManagement,
  "api-keys": ApiKeysManagement,
  "custom-fields": CustomFieldsSettings,
  "generic-custom-fields": GenericCustomFieldsSettings,
  "audit-logs": AuditLogsView,
  categories: ProductCategories,
  warehouses: WarehousesSettings,
  integrations: IntegrationsSettings,
  templates: MessageTemplatesSettings,
};

export default function Settings() {
  const { hasPermission, isAdmin, isLoading } = useUserPermissions();
  const [section, setSection] = useState<SettingsSection>("profile");

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const canAccessSettings = isAdmin || hasPermission("configuracoes", "view");

  if (!canAccessSettings && section !== "profile" && section !== "notifications") {
    setSection("profile");
  }

  if (!canAccessSettings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie seu perfil</p>
        </div>
        <ProfileSettings />
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
