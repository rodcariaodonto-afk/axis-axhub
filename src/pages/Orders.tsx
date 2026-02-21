import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "secondary",
  pending_approval: "outline",
  approved: "default",
  shipped: "default",
  completed: "default",
  canceled: "destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando",
  approved: "Aprovado",
  shipped: "Enviado",
  completed: "Concluído",
  canceled: "Cancelado",
};

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = orders.filter((o) =>
    o.number.toLowerCase().includes(search.toLowerCase()) ||
    (o.customers?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">Gerencie seus pedidos de venda</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por número ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id} className="border-border">
                    <TableCell className="font-mono text-xs">{o.number}</TableCell>
                    <TableCell className="font-medium">{o.customers?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[o.status] as any || "secondary"}>
                        {statusLabels[o.status] || o.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.paid_status === "paid" ? "default" : "secondary"}>
                        {o.paid_status === "paid" ? "Pago" : o.paid_status === "partial" ? "Parcial" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">R$ {Number(o.total).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
