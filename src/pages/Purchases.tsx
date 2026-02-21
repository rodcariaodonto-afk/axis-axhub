import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviada", received: "Recebida", completed: "Concluída" };

export default function Purchases() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("purchase_orders").select("*, suppliers(name)").order("created_at", { ascending: false }).then(({ data }) => {
      setPos(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ordens de Compra</h1>
        <p className="text-muted-foreground">Gerencie suas compras com fornecedores</p>
      </div>
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Nº</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entrega Prevista</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              pos.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma ordem de compra</TableCell></TableRow> :
              pos.map((p) => (
                <TableRow key={p.id} className="border-border">
                  <TableCell className="font-mono text-xs">{p.number}</TableCell>
                  <TableCell className="font-medium">{p.suppliers?.name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{statusLabels[p.status] || p.status}</Badge></TableCell>
                  <TableCell>{p.expected_delivery_date ? new Date(p.expected_delivery_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(p.total_amount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
