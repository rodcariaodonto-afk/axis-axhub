import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpCircle, ArrowDownCircle, Banknote, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import FinanceCategoryManager from "@/components/finance/FinanceCategoryManager";

export default function Finance() {
  const [totals, setTotals] = useState({ receivable: 0, payable: 0, bankBalance: 0, paidThisMonth: 0, receivedThisMonth: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: rec }, { data: pay }, { data: banks }] = await Promise.all([
        supabase.from("receivables").select("amount, status, due_date, paid_at, description, created_at, customers(name)").order("created_at", { ascending: false }),
        supabase.from("payables").select("amount, status, due_date, paid_at, description, created_at, suppliers(name)").order("created_at", { ascending: false }),
        supabase.from("bank_accounts").select("balance"),
      ]);

      const recList = rec || [];
      const payList = pay || [];

      const pendingRec = recList.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
      const pendingPay = payList.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
      const bankBalance = (banks || []).reduce((s, b) => s + Number(b.balance), 0);

      // Totals paid/received this month
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const receivedThisMonth = recList.filter((r) => r.status === "paid" && r.paid_at?.startsWith(monthStart)).reduce((s, r) => s + Number(r.amount), 0);
      const paidThisMonth = payList.filter((p) => p.status === "paid" && p.paid_at?.startsWith(monthStart)).reduce((s, p) => s + Number(p.amount), 0);

      setTotals({ receivable: pendingRec, payable: pendingPay, bankBalance, paidThisMonth, receivedThisMonth });

      // Chart: 5 past + current + 1 future = 7 months
      const months: Record<string, { rec: number; pay: number }> = {};
      for (let i = 5; i >= -1; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months[key] = { rec: 0, pay: 0 };
      }
      recList.forEach((r) => {
        const k = r.status === "paid" && r.paid_at ? r.paid_at.substring(0, 7) : r.due_date?.substring(0, 7);
        if (k && months[k]) months[k].rec += Number(r.amount);
      });
      payList.forEach((p) => {
        const k = p.status === "paid" && p.paid_at ? p.paid_at.substring(0, 7) : p.due_date?.substring(0, 7);
        if (k && months[k]) months[k].pay += Number(p.amount);
      });
      setChartData(Object.entries(months).map(([month, v]) => ({
        month: month.substring(5) + "/" + month.substring(2, 4),
        Receber: v.rec,
        Pagar: v.pay,
      })));

      // Recent combined transactions (5 most recent)
      const combined = [
        ...recList.slice(0, 10).map((r) => ({ ...r, type: "receivable" as const, entity: r.customers?.name })),
        ...payList.slice(0, 10).map((p) => ({ ...p, type: "payable" as const, entity: p.suppliers?.name })),
      ];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentItems(combined.slice(0, 5));

      setLoading(false);
    };
    fetchAll();
  }, []);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const statusLabels: Record<string, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", canceled: "Cancelado" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Visão geral financeira do seu negócio</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">A Receber (Pendente)</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.receivable)}</div></CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">A Pagar (Pendente)</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.payable)}</div></CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Bancário</CardTitle>
                <Banknote className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.bankBalance)}</div></CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recebido no Mês</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.receivedThisMonth)}</div></CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pago no Mês</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : fmt(totals.paidThisMonth)}</div></CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle>Fluxo de Caixa — 7 meses</CardTitle></CardHeader>
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

          <Card className="border-border bg-card">
            <CardHeader><CardTitle>Últimos Lançamentos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : recentItems.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lançamento encontrado</TableCell></TableRow>
                  ) : (
                    recentItems.map((item, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell>
                          <Badge variant={item.type === "receivable" ? "default" : "secondary"}>
                            {item.type === "receivable" ? "Receber" : "Pagar"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-muted-foreground">{item.entity || "—"}</TableCell>
                        <TableCell>{new Date(item.due_date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === "paid" ? "default" : item.status === "overdue" ? "destructive" : "secondary"}>
                            {statusLabels[item.status] || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmt(Number(item.amount))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <FinanceCategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
