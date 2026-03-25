import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, ArrowUpCircle, AlertTriangle, Users, Truck, Repeat, TrendingUp, CreditCard, UserMinus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Metrics { activeProducts: number; pendingOrders: number; totalReceivable: number; lowStock: number; totalCustomers: number; totalSuppliers: number; }
interface SaaSMetrics { mrr: number; arr: number; activeSubscriptions: number; churnRate: number; hasSubs: boolean; }

const statusLabels: Record<string, string> = { draft: "Rascunho", pending_approval: "Aguardando", approved: "Aprovado", shipped: "Enviado", completed: "Concluído", canceled: "Cancelado" };

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({ activeProducts: 0, pendingOrders: 0, totalReceivable: 0, lowStock: 0, totalCustomers: 0, totalSuppliers: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [saas, setSaas] = useState<SaaSMetrics>({ mrr: 0, arr: 0, activeSubscriptions: 0, churnRate: 0, hasSubs: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [products, orders, receivables, stock, customers, suppliers, recent] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["draft", "pending_approval", "approved"]),
        supabase.from("receivables").select("amount, due_date").eq("status", "pending"),
        supabase.from("product_stock").select("quantity, min_quantity"),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("number, total, status, created_at, customers(name)").order("created_at", { ascending: false }).limit(5),
      ]);

      const totalReceivable = (receivables.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
      const lowStock = (stock.data || []).filter((s) => s.min_quantity > 0 && s.quantity <= s.min_quantity).length;
      setMetrics({ activeProducts: products.count || 0, pendingOrders: orders.count || 0, totalReceivable, lowStock, totalCustomers: customers.count || 0, totalSuppliers: suppliers.count || 0 });
      setRecentOrders(recent.data || []);

      // Monthly revenue chart
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0; }
      (receivables.data || []).forEach((r) => { const k = r.due_date?.substring(0, 7); if (k && months[k] !== undefined) months[k] += Number(r.amount); });
      setChartData(Object.entries(months).map(([m, v]) => ({ month: m.substring(5) + "/" + m.substring(2, 4), valor: v })));

      // SaaS metrics
      const { data: allSubs } = await supabase.from("subscriptions").select("mrr, status, canceled_at");
      if (allSubs && allSubs.length > 0) {
        const activeSubs = allSubs.filter((s: any) => s.status === "active");
        const mrr = activeSubs.reduce((sum: number, s: any) => sum + Number(s.mrr || 0), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const canceledThisMonth = allSubs.filter((s: any) => s.status === "canceled" && s.canceled_at && s.canceled_at >= monthStart).length;
        const totalAtStart = allSubs.length - canceledThisMonth + canceledThisMonth; // approximate
        const churnRate = totalAtStart > 0 ? (canceledThisMonth / totalAtStart) * 100 : 0;
        setSaas({ mrr, arr: mrr * 12, activeSubscriptions: activeSubs.length, churnRate: Math.round(churnRate * 10) / 10, hasSubs: true });
      }

      setLoading(false);
    };
    fetchAll();
  }, []);

  const cards = [
    { label: "Produtos Ativos", value: metrics.activeProducts.toString(), icon: Package, color: "text-primary" },
    { label: "Pedidos Pendentes", value: metrics.pendingOrders.toString(), icon: ShoppingCart, color: "text-warning" },
    { label: "A Receber", value: `R$ ${metrics.totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: ArrowUpCircle, color: "text-success" },
    { label: "Estoque Baixo", value: metrics.lowStock.toString(), icon: AlertTriangle, color: "text-destructive" },
    { label: "Clientes", value: metrics.totalCustomers.toString(), icon: Users, color: "text-primary" },
    { label: "Fornecedores", value: metrics.totalSuppliers.toString(), icon: Truck, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1><p className="text-muted-foreground">Visão geral do seu negócio</p></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle><card.icon className={`h-4 w-4 ${card.color}`} /></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>{loading ? "..." : card.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-lg">Receitas — Últimos 6 meses</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-8 text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-lg">Pedidos Recentes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-border"><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentOrders.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum pedido</TableCell></TableRow> :
                recentOrders.map((o) => (
                  <TableRow key={o.number} className="border-border">
                    <TableCell className="font-mono text-xs">{o.number}</TableCell>
                    <TableCell>{o.customers?.name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{statusLabels[o.status] || o.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">R$ {Number(o.total).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
