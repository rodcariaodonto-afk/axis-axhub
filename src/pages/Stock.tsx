import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Warehouse, AlertTriangle, Package, Plus, ArrowUpDown } from "lucide-react";

export default function Stock() {
  const [stockData, setStockData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movDialog, setMovDialog] = useState(false);
  const [whDialog, setWhDialog] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [movForm, setMovForm] = useState({ product_id: "", warehouse_id: "", type: "in", quantity: "", reason: "", notes: "" });
  const [whForm, setWhForm] = useState({ name: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [{ data: stock }, { data: wh }] = await Promise.all([
      supabase.from("product_stock").select("*, products(name, sku), warehouses(name)").order("updated_at", { ascending: false }),
      supabase.from("warehouses").select("*").order("created_at"),
    ]);
    setStockData(stock || []); setWarehouses(wh || []); setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openMovDialog = async () => {
    const [{ data: p }, { data: w }] = await Promise.all([
      supabase.from("products").select("id, name, sku").order("name"),
      supabase.from("warehouses").select("id, name").order("name"),
    ]);
    setProducts(p || []); setWarehouses(w || []);
    setMovForm({ product_id: "", warehouse_id: "", type: "in", quantity: "", reason: "", notes: "" });
    setMovDialog(true);
  };

  const handleMovement = async () => {
    if (!movForm.product_id || !movForm.warehouse_id || !movForm.quantity) { toast({ title: "Preencha todos os campos", variant: "destructive" }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;
    const qty = parseInt(movForm.quantity);
    
    await supabase.from("stock_movements").insert({
      tenant_id: profile.tenant_id, product_id: movForm.product_id, warehouse_id: movForm.warehouse_id,
      type: movForm.type, quantity: qty, reason: movForm.reason || null, notes: movForm.notes || null,
    });

    const { data: existing } = await supabase.from("product_stock").select("id, quantity").eq("product_id", movForm.product_id).eq("warehouse_id", movForm.warehouse_id).single();
    const delta = movForm.type === "in" ? qty : -qty;
    if (existing) {
      await supabase.from("product_stock").update({ quantity: Math.max(0, existing.quantity + delta) }).eq("id", existing.id);
    } else if (movForm.type === "in") {
      await supabase.from("product_stock").insert({ tenant_id: profile.tenant_id, product_id: movForm.product_id, warehouse_id: movForm.warehouse_id, quantity: qty });
    }
    toast({ title: "Movimentação registrada!" }); setMovDialog(false); fetchData();
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", u.id).single();
    if (!profile) return;
    const { error } = await supabase.from("warehouses").insert({ tenant_id: profile.tenant_id, name: whForm.name });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Depósito criado!" }); setWhDialog(false); setWhForm({ name: "" }); fetchData(); }
  };

  const lowStock = stockData.filter((s) => s.quantity <= s.min_quantity && s.min_quantity > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Estoque</h1><p className="text-muted-foreground">Controle de estoque por depósito</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWhDialog(true)}><Plus className="mr-2 h-4 w-4" />Depósito</Button>
          <Button onClick={openMovDialog}><ArrowUpDown className="mr-2 h-4 w-4" />Movimentação</Button>
        </div>
      </div>

      <Dialog open={whDialog} onOpenChange={setWhDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo Depósito</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateWarehouse} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={whForm.name} onChange={(e) => setWhForm({ name: e.target.value })} required /></div>
            <Button type="submit" className="w-full">Criar Depósito</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={movDialog} onOpenChange={setMovDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={movForm.product_id} onValueChange={(v) => setMovForm({ ...movForm, product_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Depósito</Label>
                <Select value={movForm.warehouse_id} onValueChange={(v) => setMovForm({ ...movForm, warehouse_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={movForm.type} onValueChange={(v) => setMovForm({ ...movForm, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in">Entrada</SelectItem><SelectItem value="out">Saída</SelectItem><SelectItem value="adjustment">Ajuste</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="1" value={movForm.quantity} onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Motivo</Label><Input value={movForm.reason} onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })} placeholder="Ex: compra, venda" /></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={movForm.notes} onChange={(e) => setMovForm({ ...movForm, notes: e.target.value })} /></div>
            <Button onClick={handleMovement} className="w-full" disabled={!movForm.product_id || !movForm.warehouse_id || !movForm.quantity}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle><Package className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{stockData.length}</div></CardContent></Card>
        <Card className="border-border bg-card"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Estoque Baixo</CardTitle><AlertTriangle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold">{lowStock.length}</div></CardContent></Card>
        <Card className="border-border bg-card"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Depósitos</CardTitle><Warehouse className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{warehouses.length}</div></CardContent></Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Depósito</TableHead><TableHead className="text-right">Quantidade</TableHead><TableHead className="text-right">Mínimo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
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
                  <TableCell>{s.min_quantity > 0 && s.quantity <= s.min_quantity ? <Badge variant="destructive">Baixo</Badge> : <Badge variant="secondary">Normal</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
