import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ROLES: AppRole[] = ["admin", "sales", "finance", "operations", "accounting", "readonly"];
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

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: profiles } = useQuery({
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

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // delete old roles for user, insert new
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      if (tenantId) {
        await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "user_roles", entity_id: userId, action: "update", after_json: { role } as any });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast({ title: "Perfil atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar perfil", variant: "destructive" }),
  });

  const getRoleForUser = (uid: string): AppRole => {
    const r = roles?.find((r) => r.user_id === uid);
    return r?.role ?? "readonly";
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader><CardTitle>Usuários do Tenant</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Perfil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell>
                  <Select
                    value={getRoleForUser(p.id)}
                    onValueChange={(v) => updateRole.mutate({ userId: p.id, role: v as AppRole })}
                    disabled={p.id === user?.id}
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
