import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useRepassesAdmin,
  useUpdateRepasseStatus,
  type RepasseAdmin,
  type RepasseAdminFilters,
} from "@/hooks/useRepasseAdmin";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import { RepasseComprovante } from "./RepasseComprovante";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente:  { label: "Pendente",  className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  aprovado:  { label: "Aprovado",  className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  pago:      { label: "Pago",      className: "bg-green-500/15 text-green-600 border-green-500/30" },
  cancelado: { label: "Cancelado", className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

function fmtDate(d: string) {
  return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function RepasseHistoryTable() {
  const [filters, setFilters] = useState<RepasseAdminFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: providers = [] } = usePJProviders();
  const { data: repasses = [], isLoading } = useRepassesAdmin(filters);
  const updateStatus = useUpdateRepasseStatus();

  function setFilter<K extends keyof RepasseAdminFilters>(k: K, v: RepasseAdminFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  function clearFilters() {
    setFilters({});
  }

  async function handleMarkPaid(repasse: RepasseAdmin) {
    try {
      await updateStatus.mutateAsync({ id: repasse.id, status: "pago" });
      toast.success("Repasse marcado como pago");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao atualizar status");
    }
  }

  const hasActiveFilters = !!(filters.pjId || filters.startDate || filters.endDate || filters.status);

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
            Limpar filtros
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
            <Label className="text-xs text-muted-foreground shrink-0">De</Label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={filters.startDate ?? ""}
              onChange={(e) => setFilter("startDate", e.target.value || undefined)}
            />
            <Label className="text-xs text-muted-foreground shrink-0">Até</Label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={filters.endDate ?? ""}
              onChange={(e) => setFilter("endDate", e.target.value || undefined)}
            />
          </div>

          <Select value={filters.status ?? "todos"} onValueChange={(v) => setFilter("status", v === "todos" ? undefined : v)}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando repasses...
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
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comprovante</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {repasses.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, className: "bg-muted text-muted-foreground" };
                const canMarkPaid = r.status === "pendente" || r.status === "aprovado";
                return (
                  <TableRow key={r.id} className="border-border hover:bg-accent/20">
                    <TableCell className="font-medium">{r.pj_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{fmtDate(r.data_repasse)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtCurrency(r.valor)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", cfg.className)}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RepasseComprovante repasse={r} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canMarkPaid && !r.comprovante_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={updateStatus.isPending}
                          onClick={() => handleMarkPaid(r)}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Marcar pago
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
    </div>
  );
}

// small helper used only here
function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("text-sm font-medium leading-none", className)}>{children}</span>;
}
