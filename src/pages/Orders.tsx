import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2 } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "secondary", pending_approval: "outline", approved: "default",
  shipped: "default", completed: "default", canceled: "destructive",
};
const statusLabels: Record<string, string> = {
  draft: "Rascunho", pending_approval: "Aguardando", approved: "Aprovado",
  shipped: "Enviado", completed: "Concluído", canceled: "Cancelado",
};

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, customers(name)")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const loadFormData = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("products").select("id, name, price, sku").eq("is_active", true).order("name"),
    ]);
    setCustomers(c || []);
    setProducts(p || []);
  };

  const handleOpenDialog = () => {
    loadFormData();
    setSelectedCustomer("");
    setItems([]);
    setNotes("");
    setDialogOpen(true);
  };

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const qty = parseInt(itemQty) || 1;
    setItems([...items, {
      product_id: product.id,
      product_name: `${product.name} (${product.sku})`,
      quantity: qty,
      unit_price: Number(product.price),
      total: qty * Number(product.price),
    }]);
    setSelectedProduct("");
    setItemQty("1");
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);

  const handleCreate = async () => {
    if (!selectedCustomer || items.length === 0) {
      toast({ title: "Erro", description: "Selecione um cliente e adicione itens.", variant: "destructive" });
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;

    // Generate order number
    const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await supabase.from("orders").insert({
      tenant_id: profile.tenant_id,
      number: orderNumber,
      customer_id: selectedCustomer,
      subtotal,
      total: subtotal,
      notes: notes || null,
    }).select().single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    // Insert order items
    const orderItems = items.map((i) => ({
      tenant_id: profile.tenant_id,
      order_id: order.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total: i.total,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      toast({ title: "Erro nos itens", description: itemsError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Pedido criado!", description: `Número: ${orderNumber}` });
    setDialogOpen(false);
    fetchOrders();
  };

  const filtered = orders.filter((o) =>
    o.number.toLowerCase().includes(search.toLowerCase()) ||
    (o.customers?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie seus pedidos de venda</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}><Plus className="mr-2 h-4 w-4" />Novo Pedido</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Adicionar Item</Label>
                <div className="flex gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Produto" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — R$ {Number(p.price).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(e.target.value)} className="w-20" placeholder="Qtd" />
                  <Button type="button" variant="secondary" onClick={addItem} disabled={!selectedProduct}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Preço Un.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell className="text-sm">{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">R$ {item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">R$ {item.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-7 w-7">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-3 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{items.length} item(ns)</span>
                    <span className="text-lg font-bold">Total: R$ {subtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas do pedido (opcional)" />
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={!selectedCustomer || items.length === 0}>
                Criar Pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
