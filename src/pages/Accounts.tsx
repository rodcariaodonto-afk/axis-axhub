import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Building2 } from "lucide-react";

const SEGMENTS = ["Tecnologia", "Varejo", "Serviços", "Indústria", "Saúde", "Educação", "Financeiro", "Outro"];

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSegment, setFilterSegment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", cnpj: "", email: "", phone: "", segment: "", address: "" });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("crm_accounts").select("*").order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", cnpj: "", email: "", phone: "", segment: "", address: "" });
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      cnpj: a.cnpj || "",
      email: a.email || "",
      phone: a.phone || "",
      segment: a.segment || "",
      address: a.address_json?.street || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      cnpj: form.cnpj || null,
      email: form.email || null,
      phone: form.phone || null,
      segment: form.segment || null,
      address_json: form.address ? { street: form.address } : null,
    };

    if (editingId) {
      const { error } = await supabase.from("crm_accounts").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Conta atualizada!" });
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (!profile) return;
      const { error } = await supabase.from("crm_accounts").insert({ ...payload, tenant_id: profile.tenant_id });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Conta criada!" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const filtered = accounts.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || (a.cnpj || "").includes(search) || (a.email || "").toLowerCase().includes(search.toLowerCase());
    const matchSegment = filterSegment === "all" || a.segment === filterSegment;
    return matchSearch && matchSegment;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
          <p className="text-muted-foreground">Gerencie as contas/empresas do CRM</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editingId ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome da Empresa *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" /></div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select value={form.segment || "__none__"} onValueChange={(v) => setForm({ ...form, segment: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Endereço</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
            <Button type="submit" className="w-full">{editingId ? "Salvar" : "Criar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CNPJ ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSegment} onValueChange={setFilterSegment}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id} className="border-border">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {a.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.cnpj || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.phone || "—"}</TableCell>
                  <TableCell>{a.segment ? <Badge variant="outline">{a.segment}</Badge> : "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
