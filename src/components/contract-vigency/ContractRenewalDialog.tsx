import { useState } from "react";
import { CheckCircle, XCircle, Calendar, RefreshCw, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContractRenewals, type ContractRenewal } from "@/hooks/useContractRenewals";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ContractRenewalDialogProps {
  renewal: (ContractRenewal & { _contract: any }) | null;
  open: boolean;
  onClose: () => void;
}

function fmt(date: string) {
  return format(parseISO(date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
}

function formatCurrency(value: number | null, currency = "BRL") {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function ContractRenewalDialog({ renewal, open, onClose }: ContractRenewalDialogProps) {
  const { approve, reject } = useContractRenewals();
  const { toast } = useToast();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  if (!renewal) return null;

  const isPending = renewal.status === "pendente";

  async function handleApprove() {
    setConfirmApprove(false);
    try {
      await approve.mutateAsync(renewal!);
      toast({ title: "Renovação aprovada", description: "Novo contrato criado com sucesso." });
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" });
    }
  }

  async function handleReject() {
    setConfirmReject(false);
    try {
      await reject.mutateAsync(renewal!.id);
      toast({ title: "Renovação rejeitada." });
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao rejeitar", description: e.message, variant: "destructive" });
    }
  }

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pendente:  { label: "Pendente",   className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
    aprovada:  { label: "Aprovada",   className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
    executada: { label: "Executada",  className: "bg-green-500/15 text-green-600 border-green-500/30" },
    rejeitada: { label: "Rejeitada",  className: "bg-red-500/15 text-red-500 border-red-500/30" },
  };
  const badge = STATUS_BADGE[renewal.status] ?? STATUS_BADGE["pendente"];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Renovação de Contrato</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {renewal.contract_name ?? "Contrato"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline" className={`text-xs ${badge.className}`}>{badge.label}</Badge>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Término original
                </span>
                <span className="font-medium">{fmt(renewal.original_end_date)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Novo início
                </span>
                <span className="font-medium text-primary">{fmt(renewal.new_start_date)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Novo término
                </span>
                <span className="font-medium text-primary">{fmt(renewal.new_end_date)}</span>
              </div>
              {renewal.contract_value != null && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">{formatCurrency(renewal.contract_value)}</span>
                </div>
              )}
            </div>

            {!isPending && renewal.approved_at && (
              <p className="text-xs text-muted-foreground">
                {renewal.status === "executada" ? "Aprovado" : "Processado"} em{" "}
                {format(parseISO(renewal.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          {isPending && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                onClick={() => setConfirmReject(true)}
                disabled={reject.isPending || approve.isPending}
              >
                <XCircle className="h-4 w-4" /> Rejeitar
              </Button>
              <Button
                className="gap-2"
                onClick={() => setConfirmApprove(true)}
                disabled={approve.isPending || reject.isPending}
              >
                {approve.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle className="h-4 w-4" />
                }
                Aprovar renovação
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Approve */}
      <AlertDialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Isso criará um novo contrato com as datas atualizadas (
              {fmt(renewal.new_start_date)} → {fmt(renewal.new_end_date)}).
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>Confirmar aprovação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Reject */}
      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar rejeição</AlertDialogTitle>
            <AlertDialogDescription>
              A renovação do contrato "{renewal.contract_name}" será rejeitada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleReject}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
