import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Banknote } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Finance() {
  const [totals, setTotals] = useState({ receivable: 0, payable: 0, bankBalance: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: rec }, { data: pay }, { data: banks }] = await Promise.all([
        supabase.from("receivables").select("amount, status, due_date"),
        supabase.from("payables").select("amount, status, due_date"),
        supabase.from("bank_accounts").select("balance"),
      ]);

      const pendingRec = (rec || []).filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
      const pendingPay = (pay || []).filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
      const bankBalance = (banks || []).reduce((s, b) => s + Number(b.balance), 0);
      setTotals({ receivable: pendingRec, payable: pendingPay, bankBalance });

      // Build monthly chart from last 6 months
      const months: Record<string, { rec: number; pay: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months[key] = { rec: 0, pay: 0 };
      }
      (rec || []).forEach((r) => { const k = r.due_date?.substring(0, 7); if (k && months[k]) months[k].rec += Number(r.amount); });
      (pay || []).forEach((p) => { const k = p.due_date?.substring(0, 7); if (k && months[k]) months[k].pay += Number(p.amount); });

      setChartData(Object.entries(months).map(([month, v]) => ({
        month: month.substring(5) + "/" + month.substring(2, 4),
        Receber: v.rec,
        Pagar: v.pay,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Financeiro</h1><p className="text-muted-foreground">Visão geral financeira do seu negócio</p></div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber</CardTitle><ArrowUpCircle className="h-4 w-4 text-success" /></CardHeader><CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.receivable)}</div></CardContent></Card>
        <Card className="border-border bg-card"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar</CardTitle><ArrowDownCircle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.payable)}</div></CardContent></Card>
        <Card className="border-border bg-card"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo Bancário</CardTitle><Banknote className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.bankBalance)}</div></CardContent></Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle>Fluxo de Caixa — Últimos 6 meses</CardTitle></CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="Receber" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pagar" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-muted-foreground">Cadastre receitas e despesas para visualizar o fluxo de caixa.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
