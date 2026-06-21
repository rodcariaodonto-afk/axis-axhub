import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus } from "lucide-react";
import { useTaxSettingsList, REGIME_LABELS, type TaxSettings } from "@/hooks/useTaxSettings";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import { TaxSettingsForm } from "@/components/tax-management/TaxSettingsForm";

function fmtPct(v: number) {
  if (!v || v === 0) return <span className="text-muted-foreground">—</span>;
  return `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

interface DialogState {
  open: boolean;
  pjId: string;
  pjName: string;
}

export default function TaxManagement() {
  const { data: settings = [], isLoading } = useTaxSettingsList();
  const { data: providers = [] } = usePJProviders();

  const [dialog, setDialog] = useState<DialogState>({ open: false, pjId: "", pjName: "" });
  const [addPjId, setAddPjId] = useState<string>("");

  // PJs that don't yet have a config
  const configuredIds = new Set(settings.map((s) => s.pj_id));
  const unconfiguredProviders = providers.filter((p) => !configuredIds.has(p.id));

  function openEdit(s: TaxSettings) {
    setDialog({ open: true, pjId: s.pj_id, pjName: s.pj_name ?? s.pj_id });
  }

  function openAdd() {
    setAddPjId("");
    setDialog({ open: true, pjId: "__new__", pjName: "" });
  }

  function handleAddPjSelect(id: string) {
    setAddPjId(id);
    const p = providers.find((x) => x.id === id);
    setDialog((prev) => ({ ...prev, pjId: id, pjName: p?.name ?? id }));
  }

  const isNewDialog = dialog.pjId === "__new__" || (dialog.open && !configuredIds.has(dialog.pjId) && dialog.pjId !== "__new__");
  const effectivePjId = dialog.pjId === "__new__" ? addPjId : dialog.pjId;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Impostos PJ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure as alíquotas de retenção por prestador PJ
          </p>
        </div>
        <Button onClick={openAdd} disabled={unconfiguredProviders.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar configuração
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
      ) : settings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhuma configuração cadastrada. Clique em "Adicionar configuração" para começar.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Prestador PJ</th>
                <th className="text-left px-4 py-3 font-medium">Regime</th>
                <th className="text-right px-3 py-3 font-medium">IR</th>
                <th className="text-right px-3 py-3 font-medium">PIS</th>
                <th className="text-right px-3 py-3 font-medium">COFINS</th>
                <th className="text-right px-3 py-3 font-medium">INSS</th>
                <th className="text-right px-3 py-3 font-medium">ISS</th>
                <th className="text-right px-3 py-3 font-medium">CSLL</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {settings.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.pj_name ?? s.pj_id}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {REGIME_LABELS[s.regime_tributario] ?? s.regime_tributario}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{fmtPct(s.aliquota_ir)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{fmtPct(s.aliquota_pis)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{fmtPct(s.aliquota_cofins)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{fmtPct(s.aliquota_inss)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{fmtPct(s.aliquota_iss)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{fmtPct(s.aliquota_csll)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Add dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isNewDialog ? "Adicionar configuração" : `Editar — ${dialog.pjName}`}
            </DialogTitle>
          </DialogHeader>

          {isNewDialog && (
            <div className="space-y-1.5 pb-2">
              <label className="text-sm font-medium">Prestador PJ</label>
              <Select value={addPjId} onValueChange={handleAddPjSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prestador..." />
                </SelectTrigger>
                <SelectContent>
                  {unconfiguredProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {unconfiguredProviders.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      Todos os PJs já possuem configuração
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {effectivePjId && effectivePjId !== "__new__" && (
            <TaxSettingsForm
              pjId={effectivePjId}
              pjName={dialog.pjName || undefined}
              onSave={() => setDialog((prev) => ({ ...prev, open: false }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
