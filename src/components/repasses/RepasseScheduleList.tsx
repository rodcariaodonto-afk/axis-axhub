import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Pause, Play, X, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useRepasseSchedules,
  useUpdateRepasseSchedule,
  FREQUENCIA_LABELS,
  type RepasseSchedule,
} from "@/hooks/useRepasseSchedule";
import { RepasseScheduleForm } from "./RepasseScheduleForm";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function fmtDate(d: string) {
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return d; }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ativo:     { label: "Ativo",     className: "bg-green-500/15 text-green-600 border-green-500/30" },
  pausado:   { label: "Pausado",   className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  cancelado: { label: "Cancelado", className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

export function RepasseScheduleList() {
  const { data: schedules = [], isLoading } = useRepasseSchedules();
  const update = useUpdateRepasseSchedule();
  const { toast } = useToast();

  const [editing, setEditing] = useState<RepasseSchedule | null>(null);
  const [cancelling, setCancelling] = useState<RepasseSchedule | null>(null);

  async function togglePause(s: RepasseSchedule) {
    const newStatus = s.status === "ativo" ? "pausado" : "ativo";
    try {
      await update.mutateAsync({ id: s.id, status: newStatus });
      toast({ title: newStatus === "pausado" ? "Agendamento pausado" : "Agendamento retomado" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  }

  async function handleCancel() {
    if (!cancelling) return;
    try {
      await update.mutateAsync({ id: cancelling.id, status: "cancelado" });
      toast({ title: "Agendamento cancelado" });
      setCancelling(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  }

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>;

  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
        <CalendarClock className="h-10 w-10 opacity-30" />
        <p>Nenhum agendamento cadastrado.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
              <th className="text-left px-4 py-3 font-medium">Prestador PJ</th>
              <th className="text-right px-4 py-3 font-medium">Valor</th>
              <th className="text-left px-4 py-3 font-medium">Frequência</th>
              <th className="text-left px-4 py-3 font-medium">Próxima data</th>
              <th className="text-left px-4 py-3 font-medium">Conta</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {schedules.map((s) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.ativo;
              const freqLabel = s.recorrente
                ? (s.frequencia ? FREQUENCIA_LABELS[s.frequencia] : "—")
                : "Único";
              return (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.pj_name ?? s.pj_id}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{fmtBRL(s.valor)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{freqLabel}</td>
                  <td className="px-4 py-3">{fmtDate(s.proxima_data)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.bank_account_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {s.status !== "cancelado" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(s)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => togglePause(s)}
                            disabled={update.isPending}
                            title={s.status === "ativo" ? "Pausar" : "Retomar"}
                          >
                            {s.status === "ativo"
                              ? <Pause className="h-3.5 w-3.5" />
                              : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                            onClick={() => setCancelling(s)} title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
          </DialogHeader>
          {editing && (
            <RepasseScheduleForm
              editing={editing}
              onSuccess={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <AlertDialog open={!!cancelling} onOpenChange={(o) => { if (!o) setCancelling(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O agendamento de <strong>{fmtBRL(cancelling?.valor ?? 0)}</strong> para{" "}
              <strong>{cancelling?.pj_name}</strong> será cancelado e não poderá ser reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
              Cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
