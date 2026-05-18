import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Ban, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { SuspendTenantDialog } from "@/components/admin/SuspendTenantDialog";

interface TenantInfo {
  id: string;
  name: string;
  is_active: boolean;
  suspended_at: string | null;
  deleted_at: string | null;
}

interface Props {
  tenant: TenantInfo;
  variant?: "icon" | "button"; // icon para linhas de tabela, button para header
}

/**
 * Menu de acoes contextuais sobre um tenant (suspend/reactivate por enquanto).
 * Soft_delete e hard_delete serao adicionados na Fase 3B.3.
 */
export function TenantActionsMenu({ tenant, variant = "icon" }: Props) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isSuspended = !!tenant.suspended_at || !tenant.is_active;
  const isDeleted = !!tenant.deleted_at;

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("super-admin-tenant-action", {
        body: { tenant_id: tenant.id, action: "reactivate" },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? "Erro desconhecido");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Tenant reativado",
        description: `${tenant.name} foi reativado. ${data?.profiles_affected ?? 0} usuario(s) desbloqueado(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenant.id] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao reativar tenant",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isDeleted) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Excluido
      </span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "icon" ? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={reactivateMutation.isPending}>
              {reactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Acoes
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {isSuspended ? (
            <DropdownMenuItem
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-2 text-primary" />
              Reativar tenant
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setSuspendOpen(true)}
              className="cursor-pointer text-orange-500 focus:text-orange-500"
            >
              <Ban className="h-4 w-4 mr-2" />
              Suspender tenant
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SuspendTenantDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        tenantId={tenant.id}
        tenantName={tenant.name}
      />
    </>
  );
}
