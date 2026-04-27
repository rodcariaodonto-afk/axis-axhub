import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Repeat, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { ProjectionDialog, CashFlowProjection } from "./ProjectionDialog";
import { fmt } from "@/lib/financial/dreCalculator";

/**
 * Aba "Fluxo Projetado" — comparativo Projetado vs Realizado.
 *
 * Spec: docs/financeiro-contabil/spec.md secao 2.4 e 3.4
 */

interface MonthlyComparison {
  month: string; // "YYYY-MM"
  monthLabel: string; // "Mai/26"
  projetadoEntradas: number;
  projetadoSaidas: number;
  projetadoSaldo: number;
  realizadoEntradas: number;
  realizadoSaidas: number;
  realizadoSaldo: number;
}

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
}

function buildPeriodMonths(monthsAhead: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function CashFlowProjectionTab() {
  const [monthsAhead, setMonthsAhead] = useState<number>(6);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProjection, setEditProjection] = useState<CashFlowProjection | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const periodMonths = useMemo(() => buildPeriodMonths(monthsAhead), [monthsAhead]);
  const periodStart = periodMonths[0] + "-01";
  const periodEnd = periodMonths[periodMonths.length - 1] + "-31";

  const { data, isLoading } = useQuery({
    queryKey: ["cash-flow-projections", monthsAhead, periodStart, periodEnd],
    queryFn: async () => {
      const [projResult, recResult, payResult] = await Promise.all([
        supabase
          .from("cash_flow_projections")
          .select("*")
          .gte("reference_month", periodStart)
          .lte("reference_month", periodEnd)
          .order("reference_month", { ascending: true }),
        supabase
          .from("receivables")
          .select("amount, paid_at")
          .eq("status", "paid")
          .gte("paid_at", periodStart)
          .lte("paid_at", periodEnd),
        supabase
          .from("payables")
          .select("amount, paid_at")
          .eq("status", "paid")
          .gte("paid_at", periodStart)
          .lte("paid_at", periodEnd),
      ]);

      if (projResult.error) throw projResult.error;
      if (recResult.error) throw recResult.error;
      if (payResult.error) throw payResult.error;

      return {
        projections: (projResult.data || []) as CashFlowProjection[],
        receivables: recResult.data || [],
        payables: payResult.data || [],
      };
    },
  });

  const monthlyData: MonthlyComparison[] = useMemo(() => {
    if (!data) return [];

    const map = new Map<string, MonthlyComparison>();
    for (const m of periodMonths) {
      map.set(m, {
        month: m,
        monthLabel: formatMonthLabel(m),
        projetadoEntradas: 0,
        projetadoSaidas: 0,
        projetadoSaldo: 0,
        realizadoEntradas: 0,
        realizadoSaidas: 0,
        realizadoSaldo: 0,
      });
    }

    for (const p of data.projections) {
      const monthKey = p.reference_month.slice(0, 7);
      const bucket = map.get(monthKey);
      if (!bucket) continue;
      const value = Number(p.projected_amount || 0);
      if (p.flow_type === "entrada") bucket.projetadoEntradas += value;
      else bucket.projetadoSaidas += value;
    }

    for (const r of data.receivables) {
      if (!r.paid_at) continue;
      const monthKey = r.paid_at.slice(0, 7);
      const bucket = map.get(monthKey);
      if (!bucket) continue;
      bucket.realizadoEntradas += Number(r.amount || 0);
    }

    for (const p of data.payables) {
      if (!p.paid_at) continue;
      const monthKey = p.paid_at.slice(0, 7);
      const bucket = map.get(monthKey);
      if (!bucket) continue;
      bucket.realizadoSaidas += Number(p.amount || 0);
    }

    return Array.from(map.values()).map((b) => ({
      ...b,
      projetadoSaldo: b.projetadoEntradas - b.projetadoSaidas,
      realizadoSaldo: b.realizadoEntradas - b.realizadoSaidas,
    }));
  }, [data, periodMonths]);

  const chartData = useMemo(() => {
    return monthlyData.map((m) => ({
      mes: m.monthLabel,
      Projetado: m.projetadoSaldo,
      Realizado: m.realizadoSaldo,
    }));
  }, [monthlyData]);

  const handleNew = () => {
    setEditProjection(null);
    setDialogOpen(true);
  };

  const handleEdit = (p: CashFlowProjection) => {
    setEditProjection(p);
    setDialogOpen(true);
  };

  const handleDelete = async (p: CashFlowProjection) => {
    if (!p.id) return;
    if (!confirm(`Excluir a projeção "${p.description}"?`)) return;
    const { error } = await supabase.from("cash_flow_projections").delete().eq("id", p.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Projeção excluída!" });
    queryClient.invalidateQueries({ queryKey: ["cash-flow-projections"] });
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["cash-flow-projections"] });
  };

  const projectionsList = data?.projections || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Período</Label>
          <Select value={String(monthsAhead)} onValueChange={(v) => setMonthsAhead(parseInt(v))}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Próximos 3 meses</SelectItem>
              <SelectItem value="6">Próximos 6 meses</SelectItem>
              <SelectItem value="12">Próximos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Projeção
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}

      {!isLoading && data && (
        <>
          {/* Tabela mensal */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Projetado vs Realizado</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Entradas Proj.</TableHead>
                      <TableHead className="text-right">Saídas Proj.</TableHead>
                      <TableHead className="text-right">Saldo Proj.</TableHead>
                      <TableHead className="text-right">Entradas Real.</TableHead>
                      <TableHead className="text-right">Saídas Real.</TableHead>
                      <TableHead className="text-right">Saldo Real.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((m) => (
                      <TableRow key={m.month} className="border-border">
                        <TableCell className="font-medium">{m.monthLabel}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">{fmt(m.projetadoEntradas)}</TableCell>
                        <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">{fmt(m.projetadoSaidas)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${m.projetadoSaldo >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {fmt(m.projetadoSaldo)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">{fmt(m.realizadoEntradas)}</TableCell>
                        <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">{fmt(m.realizadoSaidas)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${m.realizadoSaldo >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {fmt(m.realizadoSaldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico */}
          {chartData.some((d) => d.Projetado !== 0 || d.Realizado !== 0) && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Saldo: Projetado vs Realizado</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="fill-muted-foreground text-xs" />
                    <YAxis className="fill-muted-foreground text-xs" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => fmt(value)}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Projetado" stroke="hsl(220 70% 50%)" strokeWidth={2} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Realizado" stroke="hsl(142 70% 45%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Lista de projeções */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Projeções Cadastradas ({projectionsList.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Mês</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectionsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma projeção cadastrada. Clique em "Adicionar Projeção" para começar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectionsList.map((p) => (
                      <TableRow key={p.id} className="border-border">
                        <TableCell className="font-medium">{formatMonthLabel(p.reference_month.slice(0, 7))}</TableCell>
                        <TableCell>
                          {p.flow_type === "entrada" ? (
                            <Badge variant="outline" className="text-xs gap-1 border bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400">
                              <TrendingUp className="h-3 w-3" /> Entrada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1 border bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400">
                              <TrendingDown className="h-3 w-3" /> Saída
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.category}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{p.description}</span>
                            {p.is_recurring && (
                              <Badge variant="outline" className="text-[10px] gap-1 h-5">
                                <Repeat className="h-2.5 w-2.5" />
                                Recorrente
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {fmt(Number(p.projected_amount))}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <ProjectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projection={editProjection}
        onSaved={onSaved}
      />
    </div>
  );
}
