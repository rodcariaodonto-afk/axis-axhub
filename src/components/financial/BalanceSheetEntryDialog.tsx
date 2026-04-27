import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/**
 * Dialog reutilizável para criar/editar balance_sheet_entries.
 *
 * Spec: docs/financeiro-contabil/spec.md secao 2.3
 */

export interface BalanceSheetEntry {
  id?: string;
  tenant_id?: string;
  reference_date: string;
  entry_type: string;
  account_name: string;
  account_code?: string | null;
  amount: number;
  notes?: string | null;
  source?: string;
}

interface BalanceSheetEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: BalanceSheetEntry | null;
  onSaved?: () => void;
}

const ENTRY_TYPE_OPTIONS = [
  { value: "ativo_circulante", label: "Ativo Circulante", hint: "Aplicações financeiras, estoques, adiantamentos" },
  { value: "ativo_nao_circulante", label: "Ativo Não Circulante", hint: "Imobilizado, intangível, investimentos de longo prazo" },
  { value: "passivo_circulante", label: "Passivo Circulante", hint: "Obrigações de curto prazo (até 12 meses)" },
  { value: "passivo_nao_circulante", label: "Passivo Não Circulante", hint: "Empréstimos e financiamentos de longo prazo" },
  { value: "patrimonio_liquido", label: "Patrimônio Líquido", hint: "Capital social, reservas, ajustes (use valor negativo para distribuição de lucros)" },
];

export function BalanceSheetEntryDialog({
  open,
  onOpenChange,
  entry,
  onSaved,
}: BalanceSheetEntryDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reference_date: new Date().toISOString().split("T")[0],
    entry_type: "patrimonio_liquido",
    account_name: "",
    account_code: "",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    if (entry) {
      setForm({
        reference_date: entry.reference_date,
        entry_type: entry.entry_type,
        account_name: entry.account_name,
        account_code: entry.account_code || "",
        amount: String(entry.amount),
        notes: entry.notes || "",
      });
    } else {
      setForm({
        reference_date: new Date().toISOString().split("T")[0],
        entry_type: "patrimonio_liquido",
        account_name: "",
        account_code: "",
        amount: "",
        notes: "",
      });
    }
  }, [entry, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (!profile) throw new Error("Perfil não encontrado");

      const payload = {
        reference_date: form.reference_date,
        entry_type: form.entry_type,
        account_name: form.account_name,
        account_code: form.account_code || null,
        amount: parseFloat(form.amount),
        notes: form.notes || null,
      };

      if (entry?.id) {
        const { error } = await supabase
          .from("balance_sheet_entries")
          .update(payload)
          .eq("id", entry.id);
        if (error) throw error;
        toast({ title: "Lançamento atualizado!" });
      } else {
        const { error } = await supabase.from("balance_sheet_entries").insert({
          ...payload,
          tenant_id: profile.tenant_id,
          created_by: user.id,
          source: "manual",
        });
        if (error) throw error;
        toast({ title: "Lançamento criado!" });
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedOption = ENTRY_TYPE_OPTIONS.find((o) => o.value === form.entry_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {entry?.id ? "Editar Lançamento" : "Novo Lançamento Manual"}
          </DialogTitle>
          <DialogDescription>
            Use para registrar capital social, reservas, ajustes contábeis ou itens não capturados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Referência</Label>
              <Input
                type="date"
                value={form.reference_date}
                onChange={(e) => setForm({ ...form, reference_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Use negativo para reduções"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.entry_type}
              onValueChange={(v) => setForm({ ...form, entry_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col items-start">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground">{selectedOption.hint}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nome da Conta</Label>
            <Input
              value={form.account_name}
              onChange={(e) => setForm({ ...form, account_name: e.target.value })}
              placeholder="Ex: Capital Social Integralizado"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              Código Contábil{" "}
              <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </Label>
            <Input
              value={form.account_code}
              onChange={(e) => setForm({ ...form, account_code: e.target.value })}
              placeholder="Ex: 2.3.1.001"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Observações{" "}
              <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
            </Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detalhes adicionais sobre este lançamento"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : entry?.id ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
