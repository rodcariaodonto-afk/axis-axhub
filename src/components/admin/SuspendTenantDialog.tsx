import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  onSuccess?: () => void;
}

/**
 * Dialog de confirmacao para suspender um tenant.
 * Apos confirmar, bloqueia o tenant e todos os seus usuarios via edge function.
 * Acao reversivel (ver ReactivateTenantDialog ou botao Reativar).
 */
export function SuspendTenantDialog({ open, onOpenChange, tenantId, tenantName, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("super-admin-tenant-action", {
        body: { tenant_id: tenantId, action: "suspend", reason: reason.trim() || undefined },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? "Erro desconhecido");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Tenant suspenso",
        description: `${tenantName} foi suspenso. ${data?.profiles_affected ?? 0} usuario(s) bloqueado(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      setReason("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao suspender tenant",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Suspender tenant
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Voce esta prestes a suspender o tenant <strong className="text-foreground">{tenantName}</strong>.
            </span>
            <span className="block">
              Todos os usuarios deste tenant serao marcados como inativos e nao conseguirao mais fazer login.
              Esta acao eh reversivel via "Reativar tenant".
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo (opcional)</Label>
          <Textarea
            id="reason"
            placeholder="Ex: inadimplencia, violacao de termos, solicitacao do cliente..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={mutation.isPending}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); mutation.mutate(); }}
            disabled={mutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar suspensao
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
