import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import WorkHoursTab, { type WorkHourEntry } from "./WorkHoursTab";
import PermissionsTab, { type PermissionEntry, MODULES } from "./PermissionsTab";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Vendas" },
  { value: "finance", label: "Financeiro" },
  { value: "operations", label: "Operação" },
  { value: "accounting", label: "Contabilidade" },
  { value: "readonly", label: "Leitura" },
];

const defaultWorkHours = (): WorkHourEntry[] =>
  [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    day_of_week: d,
    start_time: "08:00",
    end_time: "18:00",
    is_working_day: d >= 1 && d <= 5,
  }));

const defaultPermissions = (): PermissionEntry[] =>
  MODULES.map((m) => ({
    module_name: m.key,
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
    can_export: false,
    can_manage_users: false,
  }));

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editUser?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    birth_date?: string | null;
    default_theme?: string;
    default_menu?: string;
    farewell_message?: string | null;
    status?: string;
    role: AppRole;
    work_hours?: WorkHourEntry[];
    permissions?: PermissionEntry[];
  } | null;
}

export default function UserFormModal({ open, onOpenChange, onSuccess, editUser }: UserFormModalProps) {
  const isEditing = !!editUser;

  const [fullName, setFullName] = useState(editUser?.full_name || "");
  const [email, setEmail] = useState(editUser?.email || "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(editUser?.phone || "");
  const [birthDate, setBirthDate] = useState(editUser?.birth_date || "");
  const [role, setRole] = useState<AppRole>(editUser?.role || "readonly");
  const [defaultTheme, setDefaultTheme] = useState(editUser?.default_theme || "dark");
  const [defaultMenu, setDefaultMenu] = useState(editUser?.default_menu || "open");
  const [farewellMessage, setFarewellMessage] = useState(editUser?.farewell_message || "");
  const [workHours, setWorkHours] = useState<WorkHourEntry[]>(editUser?.work_hours || defaultWorkHours());
  const [permissions, setPermissions] = useState<PermissionEntry[]>(editUser?.permissions || defaultPermissions());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName || !email || (!isEditing && !password)) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editUser) {
        // Update profile
        await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            phone: phone || null,
            birth_date: birthDate || null,
            default_theme: defaultTheme,
            default_menu: defaultMenu,
            farewell_message: farewellMessage || null,
          })
          .eq("id", editUser.id);

        // Update role
        await supabase.from("user_roles").delete().eq("user_id", editUser.id);
        await supabase.from("user_roles").insert({ user_id: editUser.id, role });

        // Update work hours - delete old and insert new
        await supabase.from("user_work_hours").delete().eq("user_id", editUser.id);
        const { data: tenantData } = await supabase.rpc("get_user_tenant_id");
        if (tenantData) {
          await supabase.from("user_work_hours").insert(
            workHours.map((wh) => ({ ...wh, tenant_id: tenantData, user_id: editUser.id }))
          );
        }

        // Update permissions - delete old and insert new
        await supabase.from("user_permissions").delete().eq("user_id", editUser.id);
        if (tenantData) {
          await supabase.from("user_permissions").insert(
            permissions.map((p) => ({ ...p, tenant_id: tenantData, user_id: editUser.id }))
          );
        }

        toast({ title: "Usuário atualizado com sucesso" });
      } else {
        // Create new user via edge function
        const { data, error } = await supabase.functions.invoke("create-user-with-permissions", {
          body: {
            email,
            password,
            full_name: fullName,
            phone: phone || null,
            birth_date: birthDate || null,
            role,
            default_theme: defaultTheme,
            default_menu: defaultMenu,
            farewell_message: farewellMessage || null,
            work_hours: workHours,
            permissions,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({ title: "Usuário criado com sucesso" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar usuário", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuário" : "Adicionar Usuário"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
            <TabsTrigger value="horarios" className="flex-1">Horários</TabsTrigger>
            <TabsTrigger value="permissoes" className="flex-1">Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isEditing} placeholder="email@empresa.com" />
              </div>
              {!isEditing && (
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Perfil (Role) *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tema padrão</Label>
                <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Menu padrão</Label>
                <Select value={defaultMenu} onValueChange={setDefaultMenu}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mensagem de despedida</Label>
              <Textarea value={farewellMessage} onChange={(e) => setFarewellMessage(e.target.value)} placeholder="Mensagem automática de despedida..." rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="horarios" className="mt-4">
            <WorkHoursTab workHours={workHours} onChange={setWorkHours} />
          </TabsContent>

          <TabsContent value="permissoes" className="mt-4">
            <PermissionsTab permissions={permissions} onChange={setPermissions} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
