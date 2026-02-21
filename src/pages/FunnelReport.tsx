import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, Trophy, XCircle, Clock } from "lucide-react";

export default function FunnelReport() {
  const [deals, setDeals] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from("deals").select("*, pipeline_stages(name, order, probability)").order("created_at", { ascending: false }),
      supabase.from("pipeline_stages").select("*").order("order"),
    ]);
    setDeals(d || []);
    setStages(s || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDeals = deals.filter((d) => d.status === "open");
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");

  const totalOpenValue = openDeals.reduce((s, d) => s + Number(d.estimated_value || 0), 0);
  const totalWonValue = wonDeals.reduce((s, d) => s + Number(d.estimated_value || 0), 0);
  const totalLostValue = lostDeals.reduce((s, d) => s + Number(d.estimated_value || 0), 0);

  // Average time in pipeline (days) for closed deals
  const closedDeals = [...wonDeals, ...lostDeals];
  const avgDays = closedDeals.length > 0
    ? Math.round(closedDeals.reduce((sum, d) => {
        const diff = new Date(d.updated_at).getTime() - new Date(d.created_at).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0) / closedDeals.length)
    : 0;

  // Funnel data per stage
  const uniqueStages = stages.reduce((acc: any[], s) => {
    if (!acc.find((x) => x.name === s.name)) acc.push(s);
    return acc;
  }, []);

  const funnelData = uniqueStages.map((stage) => {
    const dealsInStage = openDeals.filter((d) => d.stage_id === stage.id);
    const allPassedThrough = deals.filter((d) => {
      const stageOrder = d.pipeline_stages?.order ?? 0;
      return stageOrder >= stage.order || d.stage_id === stage.id;
    });
    const conversionRate = allPassedThrough.length > 0
      ? Math.round((allPassedThrough.filter((d) => {
          const so = d.pipeline_stages?.order ?? 0;
          return so > stage.order || d.status === "won";
        }).length / allPassedThrough.length) * 100)
      : 0;
    const stageValue = dealsInStage.reduce((s, d) => s + Number(d.estimated_value || 0), 0);
    return { name: stage.name, deals: dealsInStage.length, value: stageValue, conversion: conversionRate, probability: stage.probability || 0 };
  });

  // Status distribution for pie chart
  const statusData = [
    { name: "Abertos", value: openDeals.length, color: "hsl(var(--primary))" },
    { name: "Ganhos", value: wonDeals.length, color: "hsl(var(--success, 142 76% 36%))" },
    { name: "Perdidos", value: lostDeals.length, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  const barColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted))"];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatório do Funil</h1>
        <p className="text-muted-foreground">Performance do pipeline de vendas</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deals Abertos</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{openDeals.length}</div><p className="text-xs text-muted-foreground">R$ {totalOpenValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deals Ganhos</CardTitle><Trophy className="h-4 w-4 text-success" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{wonDeals.length}</div><p className="text-xs text-muted-foreground">R$ {totalWonValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Deals Perdidos</CardTitle><XCircle className="h-4 w-4 text-destructive" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{lostDeals.length}</div><p className="text-xs text-muted-foreground">R$ {totalLostValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgDays} dias</div><p className="text-xs text-muted-foreground">Do início ao fechamento</p></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Funil por Etapa</CardTitle></CardHeader>
          <CardContent>
            {funnelData.length === 0 ? <p className="text-center py-8 text-muted-foreground">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="deals" name="Deals" radius={[0, 4, 4, 0]}>
                    {funnelData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? <p className="text-center py-8 text-muted-foreground">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage Table */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Detalhamento por Etapa</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Deals</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Probabilidade</TableHead>
                <TableHead className="text-right">Taxa Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnelData.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum dado disponível</TableCell></TableRow>
              ) : funnelData.map((row) => (
                <TableRow key={row.name} className="border-border">
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">{row.deals}</TableCell>
                  <TableCell className="text-right">R$ {row.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{row.probability}%</TableCell>
                  <TableCell className="text-right"><Badge variant={row.conversion >= 50 ? "default" : "secondary"}>{row.conversion}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Win rate */}
      {deals.length > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Ganho Geral</p>
                <p className="text-3xl font-bold">{closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Médio por Deal Ganho</p>
                <p className="text-3xl font-bold">R$ {wonDeals.length > 0 ? (totalWonValue / wonDeals.length).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
