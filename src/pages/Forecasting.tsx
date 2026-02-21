import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAuth } from "@/hooks/useAuth";

export default function Forecasting() {
  const { user } = useAuth();
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ period: "", forecast_amount: "", committed_amount: "" });
  const [wonByPeriod, setWonByPeriod] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data: f } = await supabase.from("deal_forecasts").select("*").order("period", { ascending: false });
    setForecasts(f || []);

    // Get won deals for comparison
    const { data: wonDeals } = await supabase.from("deals").select("estimated_value, updated_at").eq("status", "won");
    const map: Record<string, number> = {};
    (wonDeals || []).forEach((d: any) => {
      const date = new Date(d.updated_at);
      const q = Math.ceil((date.getMonth() + 1) / 3);
      const period = `${date.getFullYear()}-Q${q}`;
      map[period] = (map[period] || 0) + Number(d.estimated_value || 0);
    });
    setWonByPeriod(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile || !user) return;
    const { error } = await supabase.from("deal_forecasts").insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      period: form.period,
      forecast_amount: parseFloat(form.forecast_amount) || 0,
      committed_amount: parseFloat(form.committed_amount) || 0,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Forecast salvo!" });
    setForm({ period: "", forecast_amount: "", committed_amount: "" }); setDialogOpen(false); fetchData();
  };

  // Chart data: forecast vs actual
  const chartData = forecasts.map((f) => ({
    period: f.period,
    forecast: Number(f.forecast_amount),
    committed: Number(f.committed_amount),
    actual: wonByPeriod[f.period] || 0,
  })).reverse();

  // Current quarter
  const now = new Date();
  const currentQ = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecasting</h1>
          <p className="text-muted-foreground">Previsão de vendas por período</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Forecast</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Novo Forecast</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Período</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required placeholder={currentQ} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Forecast (R$)</Label><Input type="number" step="0.01" value={form.forecast_amount} onChange={(e) => setForm({ ...form, forecast_amount: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Comprometido (R$)</Label><Input type="number" step="0.01" value={form.committed_amount} onChange={(e) => setForm({ ...form, committed_amount: e.target.value })} required /></div>
              </div>
              <Button type="submit" className="w-full">Salvar Forecast</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Forecast vs. Realizado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="forecast" name="Forecast" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="committed" name="Comprometido" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Realizado" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Forecast</TableHead>
                <TableHead className="text-right">Comprometido</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">Atingimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecasts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum forecast registrado</TableCell></TableRow>
              ) : forecasts.map((f) => {
                const actual = wonByPeriod[f.period] || 0;
                const achievement = Number(f.forecast_amount) > 0 ? Math.round((actual / Number(f.forecast_amount)) * 100) : 0;
                return (
                  <TableRow key={f.id} className="border-border">
                    <TableCell className="font-medium">{f.period}</TableCell>
                    <TableCell className="text-right">R$ {Number(f.forecast_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {Number(f.committed_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {actual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={achievement >= 100 ? "default" : achievement >= 70 ? "secondary" : "destructive"}>
                        {achievement}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
