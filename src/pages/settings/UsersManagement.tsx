import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import UserFormModal from "@/components/users/UserFormModal";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  sales: "Vendas",
  finance: "Financeiro",
  operations: "Operação",
  accounting: "Contabilidade",
  readonly: "Leitura",
};

export default function UsersManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["tenant-profiles", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("tenant_id", tenantId!);
      return data || [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["all-user-roles", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });

  const getRoleForUser = (uid: string): AppRole => {
    const r = roles?.find((r) => r.user_id === uid);
    return r?.role ?? "readonly";
  };

  const filtered = profiles?.filter((p) => {
    const matchSearch =
      !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchRole = filterRole === "all" || getRoleForUser(p.id) === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  const handleEdit = async (profileId: string) => {
    const profile = profiles?.find((p) => p.id === profileId);
    if (!profile) return;

    const [{ data: workHours }, { data: perms }] = await Promise.all([
      supabase.from("user_work_hours").select("*").eq("user_id", profileId),
      supabase.from("user_permissions").select("*").eq("user_id", profileId),
    ]);

    setEditUser({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      birth_date: (profile as any).birth_date,
      default_theme: (profile as any).default_theme || "dark",
      default_menu: (profile as any).default_menu || "open",
      farewell_message: (profile as any).farewell_message,
      status: profile.status,
      role: getRoleForUser(profile.id),
      work_hours: workHours && workHours.length > 0 ? workHours : undefined,
      permissions: perms && perms.length > 0 ? perms : undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (profileId: string) => {
    if (profileId === user?.id) {
      toast({ title: "Você não pode excluir sua própria conta", variant: "destructive" });
      return;
    }
    if (!confirm("Tem certeza que deseja desativar este usuário?")) return;

    await supabase.from("profiles").update({ status: "inactive" }).eq("id", profileId);
    toast({ title: "Usuário desativado" });
    invalidate();
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tenant-profiles"] });
    qc.invalidateQueries({ queryKey: ["all-user-roles"] });
  };

  const handleNewUser = () => {
    setEditUser(null);
    setModalOpen(true);
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Usuários</CardTitle>
          <Button onClick={handleNewUser} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Usuário
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Perfil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "default" : "secondary"}>
                        {p.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[getRoleForUser(p.id)]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p.id)}
                          disabled={p.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={invalidate}
        editUser={editUser}
      />
    </>
  );
}
