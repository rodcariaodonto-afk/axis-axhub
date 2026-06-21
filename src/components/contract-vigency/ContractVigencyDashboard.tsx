import { useState } from "react";
import { RefreshCw, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useContractVigency, useContractAccounts, type VigencyStatus } from "@/hooks/useContractVigency";
import { useContractRenewals } from "@/hooks/useContractRenewals";
import { ContractRenewalDialog } from "./ContractRenewalDialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const VIGENCY_CONFIG: Record<VigencyStatus, { label: string; cardClass: string; badgeClass: string; iconClass: string }> = {
  vencido:      { label: "Vencidos",         cardClass: "border-red-500/30",    badgeClass: "bg-red-500/15 text-red-500 border-red-500/30",       iconClass: "text-red-500" },
  vencendo_30d: { label: "Vencendo em 30d",  cardClass: "border-yellow-500/30", badgeClass: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", iconClass: "text-yellow-500" },
  vigente:      { label: "Vigentes",         cardClass: "border-green-500/30",  badgeClass: "bg-green-500/15 text-green-600 border-green-500/30",   iconClass: "text-green-500" },
  sem_vigencia: { label: "Sem vigência",     cardClass: "border-border",        badgeClass: "bg-muted text-muted-foreground border-border",         iconClass: "text-muted-foreground" },
};

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
}

export function ContractVigencyDashboard() {
  const [accountId, setAccountId] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<VigencyStatus | "todos">("todos");
  const [selectedRenewal, setSelectedRenewal] = useState<any>(null);

  const { contracts, counts, isLoading } = useContractVigency({
    accountId: accountId !== "todos" ? accountId : undefined,
    status: statusFilter,
  });

  const { data: accounts = [] } = useContractAccounts();
  const { data: renewals = [] } = useContractRenewals("pendente");

  const summaryCards: { key: VigencyStatus; count: number }[] = [
    { key: "vencido",      count: counts.vencido },
    { key: "vencendo_30d", count: counts.vencendo_30d },
    { key: "vigente",      count: counts.vigente },
    { key: "sem_vigencia", count: counts.sem_vigencia },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ key, count }) => {
          const cfg = VIGENCY_CONFIG[key];
          return (
            <Card
              key={key}
              className={cn(
                "border bg-card cursor-pointer transition-all hover:shadow-sm",
                cfg.cardClass,
                statusFilter === key && "ring-2 ring-primary/40"
              )}
              onClick={() => setStatusFilter(statusFilter === key ? "todos" : key)}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{cfg.label}</CardTitle>
                <FileText className={cn("h-4 w-4", cfg.iconClass)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : count}</div>
                <p className="text-xs text-muted-foreground mt-1">contratos</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending renewals banner */}
      {renewals.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <RefreshCw className="h-4 w-4 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400 flex-1">
            <strong>{renewals.length}</strong> renovação{renewals.length > 1 ? "ões" : ""} pendente{renewals.length > 1 ? "s" : ""} aguardando aprovação.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-500/40 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 shrink-0"
            onClick={() => setSelectedRenewal(renewals[0])}
          >
            Revisar
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="h-8 text-sm w-56">
            <SelectValue placeholder="Filtrar por conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VigencyStatus | "todos")}>
          <SelectTrigger className="h-8 text-sm w-44">
            <SelectValue placeholder="Status de vigência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="vencendo_30d">Vencendo em 30d</SelectItem>
            <SelectItem value="vigente">Vigentes</SelectItem>
            <SelectItem value="sem_vigencia">Sem vigência</SelectItem>
          </SelectContent>
        </Select>

        {(accountId !== "todos" || statusFilter !== "todos") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setAccountId("todos"); setStatusFilter("todos"); }}
          >
            Limpar filtros
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "..." : `${contracts.length} de ${counts.total} contratos`}
        </span>
      </div>

      {/* Contracts table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Carregando contratos...
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 opacity-30" />
          <p>Nenhum contrato encontrado com os filtros selecionados</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead>Nome</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Auto-renova</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => {
                const vc = VIGENCY_CONFIG[c.vigency];
                return (
                  <TableRow key={c.id} className="border-border hover:bg-accent/20">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.account_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-medium", vc.badgeClass)}>
                        {vc.label}
                        {c.days_until_expiry !== null && c.vigency !== "vencido" && ` · ${c.days_until_expiry}d`}
                        {c.vigency === "vencido" && c.days_until_expiry !== null && ` · ${Math.abs(c.days_until_expiry)}d atrás`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(c.start_date)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(c.end_date)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.value)}</TableCell>
                    <TableCell className="text-center">
                      {c.auto_renew
                        ? <RefreshCw className="h-4 w-4 text-green-500 mx-auto" title="Auto-renovação ativa" />
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Renewals table */}
      {renewals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Renovações Pendentes</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/40">
                  <TableHead>Contrato</TableHead>
                  <TableHead>Término original</TableHead>
                  <TableHead>Novo início</TableHead>
                  <TableHead>Novo término</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(renewals as any[]).map((r) => (
                  <TableRow key={r.id} className="border-border hover:bg-accent/20">
                    <TableCell className="font-medium">{r.contract_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{fmtDate(r.original_end_date)}</TableCell>
                    <TableCell className="text-sm text-primary">{fmtDate(r.new_start_date)}</TableCell>
                    <TableCell className="text-sm text-primary">{fmtDate(r.new_end_date)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedRenewal(r)}>
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ContractRenewalDialog
        renewal={selectedRenewal}
        open={!!selectedRenewal}
        onClose={() => setSelectedRenewal(null)}
      />
    </div>
  );
}
