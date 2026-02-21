import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, ArrowUpCircle, AlertTriangle } from "lucide-react";

const metrics = [
  { label: "Produtos Ativos", value: "0", icon: Package, color: "text-primary" },
  { label: "Pedidos Pendentes", value: "0", icon: ShoppingCart, color: "text-warning" },
  { label: "A Receber", value: "R$ 0,00", icon: ArrowUpCircle, color: "text-success" },
  { label: "Estoque Baixo", value: "0", icon: AlertTriangle, color: "text-destructive" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
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
            Comece cadastrando seus produtos e clientes para usar o sistema completo.
            Use o menu lateral para navegar entre as funcionalidades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
