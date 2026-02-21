import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Target, DollarSign, Trophy, UserPlus } from "lucide-react";

export default function CrmDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [{ data: l }, { data: d }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("deals").select("*, pipeline_stages(name, order)").order("created_at", { ascending: false }),
    ]);
    setLeads(l || []);
    setDeals(d || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPIs
  const now = new Date();
  const thisMonth = leads.filter((l) => new Date(l.created_at).getMonth() === now.getMonth() && new Date(l.created_at).getFullYear() === now.getFullYear());
  const openDeals = deals.filter((d) => d.status === "open");
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const forecastValue = openDeals.reduce((s, d) => s + Number(d.estimated_value || 0), 0);
  const wonValue = wonDeals.reduce((s, d) => s + Number(d.estimated_value || 0), 0);
  const conversionRate = leads.length > 0 ? Math.round((leads.filter((l) => l.status === "converted").length / leads.length) * 100) : 0;

  // Leads by source
  const sourceMap: Record<string, number> = {};
  leads.forEach((l) => { const s = l.source || "desconhecido"; sourceMap[s] = (sourceMap[s] || 0) + 1; });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

  // Leads by status
  const statusMap: Record<string, number> = {};
  leads.forEach((l) => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
  const statusLabels: Record<string, string> = { new: "Novo", contacted: "Contatado", qualified: "Qualificado", unqualified: "Desqualificado", converted: "Convertido" };
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

  // Forecast vs Won
  const forecastVsWon = [
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
          <CardContent><div className="text-2xl font-bold">{thisMonth.length}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total Leads</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{leads.length}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Conversão</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{conversionRate}%</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Deals Abertos</CardTitle><Target className="h-4 w-4 text-primary" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{openDeals.length}</div></CardContent>
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
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
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
