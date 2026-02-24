import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Target, DollarSign, Trophy, UserPlus } from "lucide-react";

interface ChartItem {
  name: string;
  value: number;
}

export default function CrmDashboard() {
  const [totalLeads, setTotalLeads] = useState(0);
  const [monthLeads, setMonthLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  const [openDeals, setOpenDeals] = useState(0);
  const [forecastValue, setForecastValue] = useState(0);
  const [wonValue, setWonValue] = useState(0);
  const [sourceData, setSourceData] = useState<ChartItem[]>([]);
  const [statusData, setStatusData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const statusLabels: Record<string, string> = {
      new: "Novo",
      contacted: "Contatado",
      qualified: "Qualificado",
      unqualified: "Desqualificado",
      converted: "Convertido",
    };

    const [
      { count: total },
      { count: month },
      { count: converted },
      { count: open },
      { data: openDealsData },
      { data: wonDealsData },
      { data: srcData },
      { data: stsData },
    ] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", firstDay),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted"),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("deals").select("estimated_value").eq("status", "open"),
      supabase.from("deals").select("estimated_value").eq("status", "won"),
      supabase.rpc("count_leads_by_source"),
      supabase.rpc("count_leads_by_status"),
    ]);

    setTotalLeads(total ?? 0);
    setMonthLeads(month ?? 0);
    setConvertedLeads(converted ?? 0);
    setOpenDeals(open ?? 0);
    setForecastValue((openDealsData || []).reduce((s, d) => s + Number(d.estimated_value || 0), 0));
    setWonValue((wonDealsData || []).reduce((s, d) => s + Number(d.estimated_value || 0), 0));
    setSourceData((srcData || []).map((r: any) => ({ name: r.label || "desconhecido", value: Number(r.value) })));
    setStatusData((stsData || []).map((r: any) => ({ name: statusLabels[r.label] || r.label, value: Number(r.value) })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const forecastVsWon: ChartItem[] = [
    { name: "Receita Prevista", value: forecastValue },
    { name: "Receita Fechada", value: wonValue },
  ];

  const pieColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted))", "hsl(var(--destructive))"];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard CRM</h1>
        <p className="text-muted-foreground">Visão geral de leads, deals e performance comercial</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Leads (mês)</CardTitle><UserPlus className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{monthLeads.toLocaleString("pt-BR")}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Leads</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalLeads.toLocaleString("pt-BR")}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Conversão</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{conversionRate}%</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Deals Abertos</CardTitle><Target className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{openDeals}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Receita Prevista</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-lg font-bold">R$ {forecastValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Receita Fechada</CardTitle><Trophy className="h-4 w-4 text-success" /></CardHeader>
          <CardContent><div className="text-lg font-bold">R$ {wonValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Leads por Origem</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length === 0 ? <p className="text-center py-8 text-muted-foreground">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value.toLocaleString("pt-BR")}`}>
                    {sourceData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Leads por Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? <p className="text-center py-8 text-muted-foreground">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Receita Prevista vs. Fechada</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={forecastVsWon} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={130} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--accent))" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
