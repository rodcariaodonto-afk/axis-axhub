import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Warehouse, AlertTriangle, Package } from "lucide-react";

export default function Stock() {
  const [stockData, setStockData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("product_stock")
      .select("*, products(name, sku), warehouses(name)")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setStockData(data || []);
        setLoading(false);
      });
  }, []);

  const lowStock = stockData.filter((s) => s.quantity <= s.min_quantity && s.min_quantity > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">Controle de estoque por depósito</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stockData.length}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{lowStock.length}</div></CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Depósitos</CardTitle>
            <Warehouse className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{new Set(stockData.map((s) => s.warehouse_id)).size}</div></CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              stockData.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum estoque cadastrado</TableCell></TableRow> :
              stockData.map((s) => (
                <TableRow key={s.id} className="border-border">
                  <TableCell className="font-medium">{s.products?.name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{s.products?.sku || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.warehouses?.name || "—"}</TableCell>
                  <TableCell className="text-right">{s.quantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{s.min_quantity}</TableCell>
                  <TableCell>
                    {s.min_quantity > 0 && s.quantity <= s.min_quantity ? (
                      <Badge variant="destructive">Baixo</Badge>
                    ) : (
                      <Badge variant="secondary">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
