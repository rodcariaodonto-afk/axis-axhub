import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertOctagon, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export function HardDeleteTenantDialog({ open, onOpenChange, tenantId, tenantName }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("super-admin-tenant-action", {
        body: { tenant_id: tenantId, action: "hard_delete", confirm_name: confirmText },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? "Erro");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Tenant excluido permanentemente", description: `${data?.users_deleted ?? 0} usuario(s) deletado(s).` });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setConfirmText("");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir tenant", description: err.message, variant: "destructive" });
    },
  });

  const canConfirm = confirmText === tenantName;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertOctagon className="h-5 w-5" />
            EXCLUSAO PERMANENTE
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Esta acao eh <strong className="text-destructive">IRREVERSIVEL</strong>.
            </span>
            <span className="block">
              Todos os usuarios (auth.users + profiles) e dados associados ao tenant <strong className="text-foreground">{tenantName}</strong> serao deletados permanentemente do banco. Nao havera backup automatico.
            </span>
            <span className="block">
              Para confirmar, digite exatamente o nome do tenant abaixo:
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-name">Nome do tenant para confirmar</Label>
          <Input id="confirm-name" placeholder={tenantName} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={mutation.isPending} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); if (canConfirm) mutation.mutate(); }}
            disabled={!canConfirm || mutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
