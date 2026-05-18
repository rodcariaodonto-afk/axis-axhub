import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Ban, RotateCcw, Trash2, AlertOctagon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { SuspendTenantDialog } from "@/components/admin/SuspendTenantDialog";
import { HardDeleteTenantDialog } from "@/components/admin/HardDeleteTenantDialog";

interface TenantInfo {
  id: string;
  name: string;
  is_active: boolean;
  suspended_at: string | null;
  deleted_at: string | null;
}

interface Props {
  tenant: TenantInfo;
  variant?: "icon" | "button";
}

export function TenantActionsMenu({ tenant, variant = "icon" }: Props) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isSuspended = !!tenant.suspended_at || !tenant.is_active;
  const isDeleted = !!tenant.deleted_at;

  const reactivate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("super-admin-tenant-action", {
        body: { tenant_id: tenant.id, action: "reactivate" },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? "Erro");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Tenant reativado", description: `${data?.profiles_affected ?? 0} usuario(s) desbloqueado(s).` });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenant.id] });
    },
    onError: (err: Error) => toast({ title: "Erro ao reativar", description: err.message, variant: "destructive" }),
  });

  const softDelete = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("super-admin-tenant-action", {
        body: { tenant_id: tenant.id, action: "soft_delete" },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? "Erro");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Tenant marcado como excluido", description: "Soft delete aplicado. Use Hard Delete para remover permanentemente." });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
    },
    onError: (err: Error) => toast({ title: "Erro no soft delete", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "icon" ? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={reactivate.isPending || softDelete.isPending}>
              {(reactivate.isPending || softDelete.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Acoes
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {isDeleted ? (
            <DropdownMenuItem onClick={() => setHardDeleteOpen(true)} className="cursor-pointer text-destructive focus:text-destructive">
              <AlertOctagon className="h-4 w-4 mr-2" />
              Hard delete (irreversivel)
            </DropdownMenuItem>
          ) : (
            <>
              {isSuspended ? (
                <DropdownMenuItem onClick={() => reactivate.mutate()} disabled={reactivate.isPending} className="cursor-pointer">
                  <RotateCcw className="h-4 w-4 mr-2 text-primary" />
                  Reativar tenant
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setSuspendOpen(true)} className="cursor-pointer text-orange-500 focus:text-orange-500">
                  <Ban className="h-4 w-4 mr-2" />
                  Suspender tenant
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => softDelete.mutate()} disabled={softDelete.isPending} className="cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Soft delete (marcar excluido)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SuspendTenantDialog open={suspendOpen} onOpenChange={setSuspendOpen} tenantId={tenant.id} tenantName={tenant.name} />
      <HardDeleteTenantDialog open={hardDeleteOpen} onOpenChange={setHardDeleteOpen} tenantId={tenant.id} tenantName={tenant.name} />
    </>
  );
}
