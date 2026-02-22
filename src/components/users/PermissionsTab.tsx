import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const MODULES = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "crm", label: "CRM" },
  { key: "kanban", label: "Kanban" },
  { key: "campanhas", label: "Campanhas" },
  { key: "workflows", label: "Workflows" },
  { key: "automacao", label: "Automação" },
  { key: "dashboard", label: "Dashboard" },
  { key: "contatos", label: "Contatos" },
  { key: "relatorios", label: "Relatórios" },
  { key: "configuracoes", label: "Configurações" },
  { key: "financeiro", label: "Financeiro" },
  { key: "produtos", label: "Produtos" },
  { key: "funis", label: "Funis" },
];

const ACTIONS = [
  { key: "can_view", label: "Visualizar" },
  { key: "can_create", label: "Criar" },
  { key: "can_edit", label: "Editar" },
  { key: "can_delete", label: "Deletar" },
  { key: "can_export", label: "Exportar" },
  { key: "can_manage_users", label: "Gerenciar" },
] as const;

export interface PermissionEntry {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_manage_users: boolean;
}

interface PermissionsTabProps {
  permissions: PermissionEntry[];
  onChange: (perms: PermissionEntry[]) => void;
}

export default function PermissionsTab({ permissions, onChange }: PermissionsTabProps) {
  const allChecked = permissions.every((p) =>
    ACTIONS.every((a) => p[a.key])
  );

  const toggleAll = (checked: boolean) => {
    onChange(
      permissions.map((p) => {
        const updated = { ...p };
        ACTIONS.forEach((a) => { updated[a.key] = checked; });
        return updated;
      })
    );
  };

  const toggleField = (moduleName: string, field: string, value: boolean) => {
    onChange(
      permissions.map((p) =>
        p.module_name === moduleName ? { ...p, [field]: value } : p
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch checked={allChecked} onCheckedChange={toggleAll} />
        <Label className="text-sm font-medium">Acesso Total</Label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium">Módulo</th>
              {ACTIONS.map((a) => (
                <th key={a.key} className="p-3 text-center font-medium">{a.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod) => {
              const perm = permissions.find((p) => p.module_name === mod.key)!;
              return (
                <tr key={mod.key} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{mod.label}</td>
                  {ACTIONS.map((a) => (
                    <td key={a.key} className="p-3 text-center">
                      <Checkbox
                        checked={perm[a.key]}
                        onCheckedChange={(v) => toggleField(mod.key, a.key, !!v)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
