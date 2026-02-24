import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileText } from "lucide-react";

const statusOptions = ["Em elaboracao", "Ativo", "Expirado", "Cancelado", "Renovado"];
const statusColors: Record<string, string> = {
  "Em elaboracao": "bg-yellow-500/20 text-yellow-400",
  "Ativo": "bg-green-500/20 text-green-400",
  "Expirado": "bg-muted text-muted-foreground",
  "Cancelado": "bg-destructive/20 text-destructive",
  "Renovado": "bg-blue-500/20 text-blue-400",
};

export default function Contracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", account_id: "", deal_id: "", status: "Em elaboracao",
    start_date: "", end_date: "", value: "", document_url: "",
  });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [contractsRes, accountsRes, dealsRes] = await Promise.all([
      supabase.from("contracts").select("*, crm_accounts(name), deals(name)").order("created_at", { ascending: false }),
      supabase.from("crm_accounts").select("id, name").order("name"),
      supabase.from("deals").select("id, name").order("name"),
    ]);
    setContracts(contractsRes.data || []);
    setAccounts(accountsRes.data || []);
    setDeals(dealsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", account_id: "", deal_id: "", status: "Em elaboracao", start_date: "", end_date: "", value: "", document_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name, account_id: c.account_id || "", deal_id: c.deal_id || "",
      status: c.status, start_date: c.start_date || "", end_date: c.end_date || "",
      value: c.value ? String(c.value) : "", document_url: c.document_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      account_id: form.account_id || null,
      deal_id: form.deal_id || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      value: form.value ? parseFloat(form.value) : null,
      document_url: form.document_url || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("contracts").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Contrato atualizado!" }); setDialogOpen(false); fetchData(); }
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (!profile) return;
      const { error } = await supabase.from("contracts").insert({ ...payload, tenant_id: profile.tenant_id });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Contrato criado!" }); setDialogOpen(false); fetchData(); }
    }
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Contrato excluído!" }); fetchData(); }
  };

  const filtered = contracts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (v: number | null) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Gerencie contratos vinculados a contas e deals</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Contrato</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome do Contrato</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta (Account)</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deal</Label>
                <Select value={form.deal_id} onValueChange={(v) => setForm({ ...form, deal_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Término</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>URL do Documento</Label><Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="https://..." /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar contratos..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {loading ? <p className="text-muted-foreground text-center py-8">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nome</TableHead><TableHead>Conta</TableHead><TableHead>Deal</TableHead><TableHead>Status</TableHead><TableHead>Valor</TableHead><TableHead>Início</TableHead><TableHead>Término</TableHead><TableHead className="w-10"></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum contrato encontrado</TableCell></TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {c.document_url && <a href={c.document_url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4 text-primary" /></a>}
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell>{c.crm_accounts?.name || "—"}</TableCell>
                    <TableCell>{c.deals?.name || "—"}</TableCell>
                    <TableCell><Badge className={statusColors[c.status] || ""}>{c.status}</Badge></TableCell>
                    <TableCell>{formatCurrency(c.value)}</TableCell>
                    <TableCell>{c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell>{c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteContract(c.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
