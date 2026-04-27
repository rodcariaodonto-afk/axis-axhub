import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Download, FileBarChart, AlertCircle, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  calculateDRE,
  groupByMonth,
  dreToCSV,
  fmt,
  fmtPct,
} from "@/lib/financial/dreCalculator";

/**
 * Página DRE — Demonstração do Resultado do Exercício
 *
 * Consolida receivables (status=paid) e payables (status=paid) no período,
 * agrupados por accounting_type, e renderiza a estrutura hierárquica padrão
 * do DRE com KPIs e gráfico de evolução mensal.
 *
 * Spec: docs/financeiro-contabil/spec.md secao 2.2 e 3.2
 */

function getDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
}

export default function DRE() {
  const defaults = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const { toast } = useToast();

  // Query única paralela: receivables + payables no período
  const { data, isLoading, error } = useQuery({
    queryKey: ["dre", dateFrom, dateTo],
    queryFn: async () => {
      const [receivablesResult, payablesResult] = await Promise.all([
        supabase
          .from("receivables")
          .select("amount, accounting_type, paid_at")
          .eq("status", "paid")
          .gte("paid_at", dateFrom)
          .lte("paid_at", dateTo),
        supabase
          .from("payables")
          .select("amount, accounting_type, paid_at")
          .eq("status", "paid")
          .gte("paid_at", dateFrom)
          .lte("paid_at", dateTo),
      ]);

      if (receivablesResult.error) throw receivablesResult.error;
      if (payablesResult.error) throw payablesResult.error;

      return {
        receivables: receivablesResult.data || [],
        payables: payablesResult.data || [],
      };
    },
  });

  const dre = useMemo(() => {
    if (!data) return null;
    return calculateDRE({
      receivables: data.receivables.map((r) => ({
        amount: Number(r.amount),
        accounting_type: r.accounting_type,
      })),
      payables: data.payables.map((p) => ({
        amount: Number(p.amount),
        accounting_type: p.accounting_type,
      })),
    });
  }, [data]);

  const monthly = useMemo(() => {
    if (!data) return [];
    return groupByMonth(data.receivables, data.payables);
  }, [data]);

  const handleExportCSV = () => {
    if (!dre) return;
    const periodLabel = `${dateFrom} a ${dateTo}`;
    const csv = dreToCSV(dre, periodLabel);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dre_${dateFrom}_a_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "DRE exportado!", description: "Arquivo CSV baixado." });
  };

  const isEmpty =
    !isLoading &&
    !error &&
    data &&
    data.receivables.length === 0 &&
    data.payables.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6" />
            DRE — Demonstração do Resultado do Exercício
          </h1>
          <p className="text-muted-foreground">
            Resultado do período baseado na classificação contábil dos lançamentos pagos
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={!dre} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar dados: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {isEmpty && (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum lançamento pago no período selecionado.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Classifique seus contas a pagar/receber para gerar o DRE.
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/payables">Ir para Contas a Pagar</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/receivables">Ir para Contas a Receber</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dre && !isEmpty && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Receita Bruta" value={fmt(dre.receitaBruta)} variant="success" />
            <KpiCard label="Lucro Bruto" value={fmt(dre.lucroBruto)} variant={dre.lucroBruto >= 0 ? "success" : "destructive"} />
            <KpiCard label="Margem Bruta" value={fmtPct(dre.margemBruta)} variant="default" />
            <KpiCard
              label="Resultado Líquido"
              value={fmt(dre.resultadoLiquido)}
              variant={dre.resultadoLiquido >= 0 ? "success" : "destructive"}
            />
          </div>

          {/* Estrutura DRE */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Estrutura do DRE</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <DRERow label="(+) Receita Operacional" value={dre.receitaOperacional} indent={1} />
                  <DRERow label="(+) Receita Não Operacional" value={dre.receitaNaoOperacional} indent={1} />
                  <DRERow label="(=) RECEITA BRUTA" value={dre.receitaBruta} bold positive />
                  <DRERow label="(-) Deduções da Receita" value={0} indent={1} muted />
                  <DRERow label="(=) RECEITA LÍQUIDA" value={dre.receitaLiquida} bold />
                  <DRERow label="(-) Custos Operacionais (CMV)" value={dre.custoOperacional} indent={1} negative />
                  <DRERow label="(=) LUCRO BRUTO" value={dre.lucroBruto} bold positive={dre.lucroBruto >= 0} negative={dre.lucroBruto < 0} />
                  <DRERow label="(-) Despesas Administrativas" value={dre.despesaAdministrativa} indent={1} negative />
                  <DRERow label="(-) Despesas Comerciais" value={dre.despesaComercial} indent={1} negative />
                  <DRERow label="(-) Despesas Financeiras" value={dre.despesaFinanceira} indent={1} negative />
                  <DRERow label="(=) RESULTADO OPERACIONAL" value={dre.resultadoOperacional} bold positive={dre.resultadoOperacional >= 0} negative={dre.resultadoOperacional < 0} />
                  <DRERow label="(-) Investimentos / Depreciação" value={dre.investimentos} indent={1} negative />
                  <DRERow label="(+) Receita Financeira" value={dre.receitaFinanceira} indent={1} />
                  <DRERow label="(=) RESULTADO LÍQUIDO" value={dre.resultadoLiquido} bold positive={dre.resultadoLiquido >= 0} negative={dre.resultadoLiquido < 0} />
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Não Classificado */}
          {(dre.receitasNaoClassificadas > 0 || dre.despesasNaoClassificadas > 0) && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Lançamentos não classificados</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Receitas: {fmt(dre.receitasNaoClassificadas)} · Despesas: {fmt(dre.despesasNaoClassificadas)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Esses valores não entram no Resultado Líquido oficial. Classifique-os para incluir no DRE.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {dre.receitasNaoClassificadas > 0 && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/receivables">
                          Revisar Receitas
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                    {dre.despesasNaoClassificadas > 0 && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/payables">
                          Revisar Despesas
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráfico mensal */}
          {monthly.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Receitas vs Despesas por mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="fill-muted-foreground text-xs" />
                    <YAxis className="fill-muted-foreground text-xs" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => fmt(value)}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Bar dataKey="receitas" name="Receitas" fill="hsl(142 70% 45%)" />
                    <Bar dataKey="despesas" name="Despesas" fill="hsl(0 70% 50%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  variant?: "default" | "success" | "destructive";
}

function KpiCard({ label, value, variant = "default" }: KpiCardProps) {
  const colorClass =
    variant === "success" ? "text-green-600 dark:text-green-400" :
    variant === "destructive" ? "text-red-600 dark:text-red-400" :
    "text-foreground";
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface DRERowProps {
  label: string;
  value: number;
  indent?: number;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
}

function DRERow({ label, value, indent = 0, bold, positive, negative, muted }: DRERowProps) {
  const labelClass = [
    bold ? "font-semibold" : "",
    muted ? "text-muted-foreground" : "",
    indent > 0 ? "pl-8" : "",
  ].filter(Boolean).join(" ");
  const valueClass = [
    "text-right tabular-nums",
    bold ? "font-semibold" : "",
    positive ? "text-green-600 dark:text-green-400" : "",
    negative ? "text-red-600 dark:text-red-400" : "",
    muted ? "text-muted-foreground" : "",
  ].filter(Boolean).join(" ");
  return (
    <TableRow className="border-border">
      <TableCell className={labelClass}>{label}</TableCell>
      <TableCell className={valueClass}>{fmt(value)}</TableCell>
    </TableRow>
  );
}
