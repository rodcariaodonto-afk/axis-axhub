import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink } from "lucide-react";
import { useTaxRetentions, useTaxTotals, type TaxRetentionRow } from "@/hooks/useTaxDashboard";
import { usePJProviders } from "@/hooks/useRepasseAdmin";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const TAX_CARDS = [
  { key: "ir" as const,     label: "IR" },
  { key: "pis" as const,    label: "PIS" },
  { key: "cofins" as const, label: "COFINS" },
  { key: "inss" as const,   label: "INSS" },
  { key: "iss" as const,    label: "ISS" },
  { key: "csll" as const,   label: "CSLL" },
];

function exportCSV(rows: TaxRetentionRow[]) {
  const headers = [
    "PJ", "NF", "Data", "Valor Bruto",
    "IR", "PIS", "COFINS", "INSS", "ISS", "CSLL",
    "Total Retido", "Valor Líquido",
  ];
  const csvRows = rows.map((r) =>
    [
      `"${r.pj_name ?? r.pj_id}"`,
      `"${r.nf_number ?? ""}"`,
      r.created_at.slice(0, 10),
      r.valor_bruto,
      r.ir_value, r.pis_value, r.cofins_value,
      r.inss_value, r.iss_value, r.csll_value,
      r.total_retention, r.valor_liquido,
    ].join(",")
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob(["﻿" + csv, ""], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retencoes-fiscais-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TaxDashboard() {
  const { data: providers = [] } = usePJProviders();

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [pjId, setPjId] = useState<string>("all");

  const { data: rows = [], isLoading } = useTaxRetentions({
    startDate,
    endDate,
    pjId: pjId === "all" ? undefined : pjId,
  });

  const totals = useTaxTotals(rows);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Data inicial</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Data final</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prestador PJ</Label>
          <Select value={pjId} onValueChange={setPjId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportCSV(rows)} className="ml-auto gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TAX_CARDS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-lg font-bold font-mono tabular-nums">
                {fmtBRL(totals[key])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total retention summary */}
      {totals.count > 0 && (
        <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-muted/20 px-5 py-4 text-sm">
          <div>
            <span className="text-muted-foreground">Registros: </span>
            <span className="font-semibold">{totals.count}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Valor bruto total: </span>
            <span className="font-semibold font-mono">{fmtBRL(totals.valorBruto)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total retido: </span>
            <span className="font-semibold font-mono text-red-500">{fmtBRL(totals.totalRetention)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total líquido: </span>
            <span className="font-semibold font-mono text-primary">{fmtBRL(totals.valorLiquido)}</span>
          </div>
        </div>
      )}

      {/* Detailed table */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          Nenhuma retenção encontrada no período selecionado.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-3 py-2.5 font-medium">PJ</th>
                <th className="text-left px-3 py-2.5 font-medium">NF</th>
                <th className="text-right px-3 py-2.5 font-medium">Valor Bruto</th>
                <th className="text-right px-3 py-2.5 font-medium">IR</th>
                <th className="text-right px-3 py-2.5 font-medium">PIS</th>
                <th className="text-right px-3 py-2.5 font-medium">COFINS</th>
                <th className="text-right px-3 py-2.5 font-medium">INSS</th>
                <th className="text-right px-3 py-2.5 font-medium">ISS</th>
                <th className="text-right px-3 py-2.5 font-medium">CSLL</th>
                <th className="text-right px-3 py-2.5 font-medium">Líquido</th>
                <th className="px-3 py-2.5 font-medium">RPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 font-medium max-w-[160px] truncate">{r.pj_name ?? r.pj_id}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.nf_number ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{fmtBRL(r.valor_bruto)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500/80">{r.ir_value > 0 ? fmtBRL(r.ir_value) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500/80">{r.pis_value > 0 ? fmtBRL(r.pis_value) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500/80">{r.cofins_value > 0 ? fmtBRL(r.cofins_value) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500/80">{r.inss_value > 0 ? fmtBRL(r.inss_value) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500/80">{r.iss_value > 0 ? fmtBRL(r.iss_value) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500/80">{r.csll_value > 0 ? fmtBRL(r.csll_value) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-primary">{fmtBRL(r.valor_liquido)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {r.rpa_url ? (
                      <a
                        href={r.rpa_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />PDF
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
