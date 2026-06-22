import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, SlidersHorizontal, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useConciliationRepasses,
  type ConciliationFilters,
  type ConciliationRepasse,
  type ConciliationStatus,
} from "@/hooks/useConciliation";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import { ConciliationForm } from "./ConciliationForm";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ConciliationStatus, { label: string; className: string; icon: React.ElementType }> = {
  pendente:    { label: "Pendente",    className: "bg-muted/60 text-muted-foreground border-muted-foreground/30",           icon: Clock },
  conciliado:  { label: "Conciliado",  className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30", icon: CheckCircle2 },
  divergente:  { label: "Divergente",  className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",         icon: AlertTriangle },
};

function fmtDate(d: string) {
  return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
}

function fmtCurrency(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConciliationDashboard() {
  const [filters, setFilters] = useState<ConciliationFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<ConciliationRepasse | null>(null);

  const { data: providers = [] } = usePJProviders();
  const { data: repasses = [], isLoading } = useConciliationRepasses(filters);

  function setFilter<K extends keyof ConciliationFilters>(k: K, v: ConciliationFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  function clearFilters() { setFilters({}); }

  const hasActiveFilters = !!(filters.pjId || filters.startDate || filters.endDate || filters.conciliationStatus);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filtersOpen ? "default" : "outline"}
          className="h-8 gap-1.5"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">!</span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
            Limpar
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "..." : `${repasses.length} registro${repasses.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Select value={filters.pjId ?? "todos"} onValueChange={(v) => setFilter("pjId", v === "todos" ? undefined : v)}>
            <SelectTrigger className="h-8 text-sm w-52">
              <SelectValue placeholder="Filtrar por PJ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os PJ</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">De</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={filters.startDate ?? ""}
              onChange={(e) => setFilter("startDate", e.target.value || undefined)}
            />
            <span className="text-xs text-muted-foreground shrink-0">Até</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={filters.endDate ?? ""}
              onChange={(e) => setFilter("endDate", e.target.value || undefined)}
            />
          </div>

          <Select
            value={filters.conciliationStatus ?? "todos"}
            onValueChange={(v) => setFilter("conciliationStatus", v === "todos" ? undefined : v as ConciliationStatus)}
          >
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue placeholder="Conciliação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando...
        </div>
      ) : repasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Search className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum repasse encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead>Pessoa Jurídica</TableHead>
                <TableHead>Data Repasse</TableHead>
                <TableHead className="text-right">Valor Esperado</TableHead>
                <TableHead className="text-right">Valor Pago</TableHead>
                <TableHead>Data Pgto.</TableHead>
                <TableHead>ID Transação</TableHead>
                <TableHead>Conciliação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {repasses.map((r) => {
                const cfg = STATUS_CONFIG[r.conciliation_status];
                const isDivergente = r.conciliation_status === "divergente";
                return (
                  <TableRow
                    key={r.id}
                    className={cn(
                      "border-border transition-colors",
                      isDivergente
                        ? "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500"
                        : "hover:bg-accent/20"
                    )}
                  >
                    <TableCell className="font-medium">{r.pj_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{fmtDate(r.data_repasse)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtCurrency(r.valor)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.paid_amount != null ? (
                        <span className={cn(isDivergente && "text-red-600 dark:text-red-400 font-semibold")}>
                          {fmtCurrency(r.paid_amount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.paid_date ? fmtDate(r.paid_date) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {r.transaction_id ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs gap-1", cfg.className)}>
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.conciliation_status !== "conciliado" && (
                        <Button
                          size="sm"
                          variant={isDivergente ? "outline" : "default"}
                          className="h-7 text-xs"
                          onClick={() => setSelected(r)}
                        >
                          {r.conciliation_status === "divergente" ? "Reconciliar" : "Conciliar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConciliationForm
        repasse={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
