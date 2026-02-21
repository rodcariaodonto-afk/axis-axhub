import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, ArrowUpCircle, AlertTriangle, Users, Truck } from "lucide-react";

interface Metrics {
  activeProducts: number;
  pendingOrders: number;
  totalReceivable: number;
  lowStock: number;
  totalCustomers: number;
  totalSuppliers: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    activeProducts: 0, pendingOrders: 0, totalReceivable: 0, lowStock: 0, totalCustomers: 0, totalSuppliers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const [products, orders, receivables, stock, customers, suppliers] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["draft", "pending_approval", "approved"]),
        supabase.from("receivables").select("amount").eq("status", "pending"),
        supabase.from("product_stock").select("quantity, min_quantity"),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
      ]);

      const totalReceivable = (receivables.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
      const lowStock = (stock.data || []).filter((s) => s.min_quantity > 0 && s.quantity <= s.min_quantity).length;

      setMetrics({
        activeProducts: products.count || 0,
        pendingOrders: orders.count || 0,
        totalReceivable,
        lowStock,
        totalCustomers: customers.count || 0,
        totalSuppliers: suppliers.count || 0,
      });
      setLoading(false);
    };
    fetchMetrics();
  }, []);

  const cards = [
    { label: "Produtos Ativos", value: metrics.activeProducts.toString(), icon: Package, color: "text-primary" },
    { label: "Pedidos Pendentes", value: metrics.pendingOrders.toString(), icon: ShoppingCart, color: "text-warning" },
    { label: "A Receber", value: `R$ ${metrics.totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: ArrowUpCircle, color: "text-success" },
    { label: "Estoque Baixo", value: metrics.lowStock.toString(), icon: AlertTriangle, color: "text-destructive" },
    { label: "Clientes", value: metrics.totalCustomers.toString(), icon: Users, color: "text-info" },
    { label: "Fornecedores", value: metrics.totalSuppliers.toString(), icon: Truck, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${loading ? "animate-pulse" : ""}`}>
                {loading ? "..." : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Bem-vindo ao AXHUB</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Comece cadastrando seus <strong>produtos</strong> e <strong>clientes</strong> para criar pedidos.
            Use o menu lateral para navegar entre as funcionalidades do ERP.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
