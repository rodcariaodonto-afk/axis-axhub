import { useState, useEffect } from "react";
import { z } from "zod";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMarkRepassePaid, calcConciliationStatus, type ConciliationRepasse } from "@/hooks/useConciliation";

const schema = z.object({
  transaction_id: z.string().min(1, "ID da transação obrigatório"),
  paid_date:      z.string().min(1, "Data do pagamento obrigatória"),
  paid_amount:    z.coerce.number().positive("Valor deve ser positivo"),
});

type FormValues = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

interface Props {
  repasse: ConciliationRepasse | null;
  open: boolean;
  onClose: () => void;
}

export function ConciliationForm({ repasse, open, onClose }: Props) {
  const [form, setForm] = useState<Partial<FormValues>>({
    transaction_id: "",
    paid_date: new Date().toISOString().split("T")[0],
    paid_amount: undefined,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const markPaid = useMarkRepassePaid();

  useEffect(() => {
    if (repasse) {
      setForm({
        transaction_id: repasse.transaction_id ?? "",
        paid_date: repasse.paid_date ?? new Date().toISOString().split("T")[0],
        paid_amount: repasse.paid_amount ?? repasse.valor,
      });
    }
    setErrors({});
  }, [repasse, open]);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  }

  const previewStatus = form.paid_amount != null && repasse
    ? calcConciliationStatus(Number(form.paid_amount), repasse.valor)
    : null;

  const isDivergente = previewStatus === "divergente";
  const expectedValor = repasse?.valor ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.errors.forEach((err) => {
        const k = err.path[0] as keyof FormValues;
        if (!errs[k]) errs[k] = err.message;
      });
      setErrors(errs);
      return;
    }
    if (!repasse) return;

    try {
      const finalStatus = await markPaid.mutateAsync({
        id: repasse.id,
        transaction_id: result.data.transaction_id,
        paid_date: result.data.paid_date,
        paid_amount: result.data.paid_amount,
      });

      if (finalStatus === "conciliado") {
        toast.success("Repasse conciliado com sucesso");
      } else {
        toast.warning("Repasse marcado como pago com divergência de valor");
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar conciliação");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conciliar Repasse — {repasse?.pj_name ?? "PJ"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Valor esperado (read-only) */}
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor esperado</span>
            <span className="font-mono font-semibold">{fmtCurrency(expectedValor)}</span>
          </div>

          {/* ID da transação */}
          <div className="space-y-1.5">
            <Label>ID da transação bancária <span className="text-destructive">*</span></Label>
            <Input
              value={form.transaction_id ?? ""}
              onChange={(e) => set("transaction_id", e.target.value)}
              placeholder="Ex: TRX20260621001"
              className={errors.transaction_id ? "border-destructive" : ""}
            />
            {errors.transaction_id && <p className="text-xs text-destructive">{errors.transaction_id}</p>}
          </div>

          {/* Data do pagamento */}
          <div className="space-y-1.5">
            <Label>Data do pagamento efetivo <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={form.paid_date ?? ""}
              onChange={(e) => set("paid_date", e.target.value)}
              className={errors.paid_date ? "border-destructive" : ""}
            />
            {errors.paid_date && <p className="text-xs text-destructive">{errors.paid_date}</p>}
          </div>

          {/* Valor pago */}
          <div className="space-y-1.5">
            <Label>Valor pago (R$) <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.paid_amount ?? ""}
              onChange={(e) => set("paid_amount", Number(e.target.value) as any)}
              placeholder="0,00"
              className={errors.paid_amount ? "border-destructive" : ""}
            />
            {errors.paid_amount && <p className="text-xs text-destructive">{errors.paid_amount}</p>}
          </div>

          {/* Preview do status */}
          {previewStatus && (
            <div
              className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
                isDivergente
                  ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
                  : "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
              }`}
            >
              {isDivergente ? (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div>
                {isDivergente ? (
                  <>
                    <p className="font-medium">Valor divergente</p>
                    <p className="text-xs mt-0.5 opacity-80">
                      Diferença de {fmtCurrency(Math.abs((form.paid_amount ?? 0) - expectedValor))} será registrada.
                      O repasse ficará com status <strong>divergente</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Valores conferem</p>
                    <p className="text-xs mt-0.5 opacity-80">
                      O repasse será marcado como <strong>conciliado</strong>.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={markPaid.isPending}
              variant={isDivergente ? "destructive" : "default"}
            >
              {markPaid.isPending ? "Salvando..." : isDivergente ? "Salvar (Divergente)" : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
