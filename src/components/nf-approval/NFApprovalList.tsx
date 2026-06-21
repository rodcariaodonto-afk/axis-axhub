import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useNFApprovals, type NFApprovalFilters } from "@/hooks/useNFApprovals";
import { usePJProviders } from "@/hooks/useRepasseAdmin";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho:     { label: "Rascunho",     className: "bg-muted text-muted-foreground border-border" },
  pendente:     { label: "Pendente",     className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  em_aprovacao: { label: "Em aprovação", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  aprovada:     { label: "Aprovada",     className: "bg-green-500/15 text-green-600 border-green-500/30" },
  rejeitada:    { label: "Rejeitada",    className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function NFApprovalList() {
  const [filters, setFilters] = useState<NFApprovalFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: nfs = [], isLoading } = useNFApprovals(filters);
  const { data: providers = [] } = usePJProviders();

  function setFilter<K extends keyof NFApprovalFilters>(k: K, v: NFApprovalFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  const hasActiveFilters = !!(filters.pjId || filters.status || filters.startDate || filters.endDate);

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
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setFilters({})}>
            Limpar
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "..." : `${nfs.length} nota${nfs.length !== 1 ? "s" : ""}`}
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
              {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.status ?? "todos"} onValueChange={(v) => setFilter("status", v === "todos" ? undefined : v)}>
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">De</span>
            <Input type="date" className="h-8 text-sm w-36" value={filters.startDate ?? ""} onChange={(e) => setFilter("startDate", e.target.value || undefined)} />
            <span className="shrink-0">Até</span>
            <Input type="date" className="h-8 text-sm w-36" value={filters.endDate ?? ""} onChange={(e) => setFilter("endDate", e.target.value || undefined)} />
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando notas fiscais...
        </div>
      ) : nfs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Search className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma nota fiscal encontrada</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead>PJ</TableHead>
                <TableHead>Número / Série</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arquivos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nfs.map((nf) => {
                const cfg = STATUS_CONFIG[nf.status] ?? { label: nf.status, className: "bg-muted text-muted-foreground" };
                return (
                  <TableRow key={nf.id} className="border-border hover:bg-accent/20">
                    <TableCell className="font-medium">{nf.pj_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono">{nf.nf_number}</span>
                      {nf.nf_series && <span className="text-muted-foreground ml-1">/ {nf.nf_series}</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtCurrency(nf.nf_value)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(nf.nf_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(nf.nf_due_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {nf.xml_url && (
                          <a href={nf.xml_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />XML
                          </a>
                        )}
                        {nf.pdf_url && (
                          <a href={nf.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />PDF
                          </a>
                        )}
                        {!nf.xml_url && !nf.pdf_url && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
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
