import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function RetentionTab() {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const { data: tenant } = useQuery({
    queryKey: ["governance-tenant"],
    queryFn: async () => {
      const tid = (await supabase.rpc("get_user_tenant_id")).data;
      const { data } = await supabase.from("tenants").select("*").eq("id", tid as string).single();
      return data;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("governance-cancel-account", { body: { action: "cancel", reason } });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Conta cancelada", description: "Você tem 30 dias para exportar seus dados." }); qc.invalidateQueries({ queryKey: ["governance-tenant"] }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const reactivate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("governance-cancel-account", { body: { action: "reactivate" } });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Conta reativada" }); qc.invalidateQueries({ queryKey: ["governance-tenant"] }); },
  });

  const isCancelled = tenant?.status === "cancelled";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status da conta</p>
            <Badge variant={isCancelled ? "destructive" : "default"} className="mt-2">{tenant?.status ?? "—"}</Badge>
          </div>
          {isCancelled && (
            <Button variant="outline" onClick={() => reactivate.mutate()}><RotateCcw className="h-4 w-4 mr-1.5" />Reativar conta</Button>
          )}
        </div>
        {isCancelled && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div><div className="text-muted-foreground">Cancelada em</div><div className="font-medium">{tenant?.cancelled_at ? new Date(tenant.cancelled_at).toLocaleString("pt-BR") : "—"}</div></div>
            <div><div className="text-muted-foreground">Retenção até</div><div className="font-medium">{tenant?.retention_until ? new Date(tenant.retention_until).toLocaleString("pt-BR") : "—"}</div></div>
            <div><div className="text-muted-foreground">Exclusão agendada</div><div className="font-medium">{tenant?.deletion_scheduled_at ? new Date(tenant.deletion_scheduled_at).toLocaleString("pt-BR") : "—"}</div></div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Política de retenção</p>
            <p className="text-sm text-muted-foreground mt-1">
              Após o cancelamento da conta, seus dados ficam disponíveis para exportação por <strong>30 dias</strong>.
              Decorrido esse prazo, eles são permanentemente excluídos ou anonimizados conforme a política configurada.
            </p>
          </div>
        </div>
      </Card>

      {!isCancelled && (
        <Card className="p-4 border-destructive/40">
          <p className="font-medium text-destructive">Cancelar conta</p>
          <p className="text-sm text-muted-foreground mt-1 mb-3">Ação irreversível. Inicia o período de 30 dias de retenção.</p>
          <Textarea placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="mb-3" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Cancelar conta</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
                <AlertDialogDescription>
                  A conta entrará em período de retenção de 30 dias. Após o prazo, os dados serão excluídos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => cancel.mutate()}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      )}
    </div>
  );
}
