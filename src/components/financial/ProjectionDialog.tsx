import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

/**
 * Dialog reutilizável para criar/editar cash_flow_projections.
 *
 * Spec: docs/financeiro-contabil/spec.md secao 2.4 e 3.4
 */

export interface CashFlowProjection {
  id?: string;
  tenant_id?: string;
  reference_month: string;
  category: string;
  description: string;
  projected_amount: number;
  actual_amount?: number | null;
  flow_type: "entrada" | "saida";
  is_recurring?: boolean;
  notes?: string | null;
}

interface ProjectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projection?: CashFlowProjection | null;
  onSaved?: () => void;
}

function getCurrentMonthFirstDay(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

export function ProjectionDialog({
  open,
  onOpenChange,
  projection,
  onSaved,
}: ProjectionDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reference_month: getCurrentMonthFirstDay(),
    flow_type: "entrada" as "entrada" | "saida",
    category: "",
    description: "",
    projected_amount: "",
    is_recurring: false,
    notes: "",
  });

  useEffect(() => {
    if (projection) {
      setForm({
        reference_month: projection.reference_month,
        flow_type: projection.flow_type,
        category: projection.category,
        description: projection.description,
        projected_amount: String(projection.projected_amount),
        is_recurring: projection.is_recurring || false,
        notes: projection.notes || "",
      });
    } else {
      setForm({
        reference_month: getCurrentMonthFirstDay(),
        flow_type: "entrada",
        category: "",
        description: "",
        projected_amount: "",
        is_recurring: false,
        notes: "",
      });
    }
  }, [projection, open]);

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

      // Garantir que reference_month seja sempre dia 1
      const refMonthDate = new Date(form.reference_month + "T12:00:00");
      const firstDay = new Date(refMonthDate.getFullYear(), refMonthDate.getMonth(), 1)
        .toISOString()
        .split("T")[0];

      const payload = {
        reference_month: firstDay,
        flow_type: form.flow_type,
        category: form.category,
        description: form.description,
        projected_amount: parseFloat(form.projected_amount),
        is_recurring: form.is_recurring,
        notes: form.notes || null,
      };

      if (projection?.id) {
        const { error } = await supabase
          .from("cash_flow_projections")
          .update(payload)
          .eq("id", projection.id);
        if (error) throw error;
        toast({ title: "Projeção atualizada!" });
      } else {
        const { error } = await supabase.from("cash_flow_projections").insert({
          ...payload,
          tenant_id: profile.tenant_id,
          created_by: user.id,
        });
        if (error) throw error;
        toast({ title: "Projeção criada!" });
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {projection?.id ? "Editar Projeção" : "Nova Projeção de Fluxo"}
          </DialogTitle>
          <DialogDescription>
            Cadastre entradas e saídas projetadas para acompanhar o fluxo de caixa futuro.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={form.reference_month.slice(0, 7)}
                onChange={(e) => setForm({ ...form, reference_month: e.target.value + "-01" })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.flow_type}
                onValueChange={(v: "entrada" | "saida") => setForm({ ...form, flow_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (receita)</SelectItem>
                  <SelectItem value="saida">Saída (despesa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ex: Vendas, Pessoal, Marketing"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Mensalidade Curso IA"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Projetado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.projected_amount}
              onChange={(e) => setForm({ ...form, projected_amount: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="is-recurring-proj" className="cursor-pointer">
                Projeção recorrente
              </Label>
              <p className="text-xs text-muted-foreground">
                Marca visual apenas. Cadastro automático mensal não é gerado nesta versão.
              </p>
            </div>
            <Switch
              id="is-recurring-proj"
              checked={form.is_recurring}
              onCheckedChange={(v) => setForm({ ...form, is_recurring: v })}
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
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : projection?.id ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
