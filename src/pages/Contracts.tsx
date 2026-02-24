import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreHorizontal, Pencil, EyeOff, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const statusOptions = ["Em elaboracao", "Ativo", "Expirado", "Cancelado", "Renovado"];
const statusColors: Record<string, string> = {
  "Em elaboracao": "bg-muted text-muted-foreground",
  "Ativo": "bg-green-500/20 text-green-400",
  "Expirado": "bg-destructive/20 text-destructive",
  "Cancelado": "bg-foreground/20 text-foreground",
  "Renovado": "bg-blue-500/20 text-blue-400",
};
const typeOptions = ["Servico", "Venda", "Parceria", "Licenca", "Outro"];
const currencyOptions = ["BRL", "USD", "EUR"];
const PER_PAGE = 10;

function getDaysUntilExpiry(endDate: string | null) {
  if (!endDate) return null;
  return differenceInDays(parseISO(endDate), new Date());
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground">—</span>;
  if (days < 0) return <Badge className="bg-destructive/20 text-destructive">Vencido</Badge>;
  if (days <= 30) return <Badge className="bg-yellow-500/20 text-yellow-400">{days}d</Badge>;
  return <Badge className="bg-green-500/20 text-green-400">{days}d</Badge>;
}

const emptyForm = {
  name: "", account_id: "", deal_id: "", status: "Em elaboracao",
  start_date: "", end_date: "", value: "", document_url: "",
  description: "", contract_type: "", currency: "BRL",
  renewal_date: "", owner_id: "",
};

export default function Contracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const [contractsRes, accountsRes, dealsRes, usersRes] = await Promise.all([
      supabase.from("contracts").select("*, crm_accounts(id, name), deals(name)").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("crm_accounts").select("id, name").order("name"),
      supabase.from("deals").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setContracts(contractsRes.data || []);
    setAccounts(accountsRes.data || []);
    setDeals(dealsRes.data || []);
    setUsers(usersRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name, account_id: c.account_id || "", deal_id: c.deal_id || "",
      status: c.status, start_date: c.start_date || "", end_date: c.end_date || "",
      value: c.value ? String(c.value) : "", document_url: c.document_url || "",
      description: c.description || "", contract_type: c.contract_type || "",
      currency: c.currency || "BRL", renewal_date: c.renewal_date || "",
      owner_id: c.owner_id || "",
    });
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.name.trim()) { toast({ title: "Título obrigatório", variant: "destructive" }); return false; }
    if (!form.account_id) { toast({ title: "Conta obrigatória", variant: "destructive" }); return false; }
    if (!form.owner_id) { toast({ title: "Proprietário obrigatório", variant: "destructive" }); return false; }
    if (form.start_date && form.end_date && form.start_date >= form.end_date) {
      toast({ title: "Data início deve ser anterior à data término", variant: "destructive" }); return false;
    }
    if (form.value && parseFloat(form.value) < 0) {
      toast({ title: "Valor deve ser positivo", variant: "destructive" }); return false;
    }
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: any = {
      name: form.name, account_id: form.account_id || null,
      deal_id: form.deal_id || null, status: form.status,
      start_date: form.start_date || null, end_date: form.end_date || null,
      value: form.value ? parseFloat(form.value) : null,
      document_url: form.document_url || null, updated_at: new Date().toISOString(),
      description: form.description || null, contract_type: form.contract_type || null,
      currency: form.currency, renewal_date: form.renewal_date || null,
      owner_id: form.owner_id || null,
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

  const deactivateContract = async (id: string) => {
    const { error } = await supabase.from("contracts").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Contrato desativado!" }); fetchData(); }
  };

  const filtered = contracts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchAccount = filterAccount === "all" || c.account_id === filterAccount;
    const matchDateFrom = !filterDateFrom || (c.start_date && c.start_date >= filterDateFrom);
    const matchDateTo = !filterDateTo || (c.end_date && c.end_date <= filterDateTo);
    return matchSearch && matchStatus && matchAccount && matchDateFrom && matchDateTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterAccount, filterDateFrom, filterDateTo]);

  const formatCurrency = (v: number | null, cur: string = "BRL") =>
    v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: cur }) : "—";

  const noAccounts = accounts.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Gerencie contratos vinculados a contas e deals</p>
        </div>
        <Button onClick={openCreate} disabled={noAccounts}><Plus className="mr-2 h-4 w-4" />Novo Contrato</Button>
      </div>

      {noAccounts && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <p className="text-sm">Você precisa criar uma conta primeiro. <a href="/accounts" className="underline text-primary">Ir para Contas</a></p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta (Account) *</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma conta..." /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proprietário *</Label>
                <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Título do Contrato *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>URL do Documento</Label><Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Término</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Renovação</Label><Input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar contratos..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos Status</SelectItem>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Conta" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas Contas</SelectItem>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" className="w-40" placeholder="De" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            <Input type="date" className="w-40" placeholder="Até" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
          {loading ? <p className="text-muted-foreground text-center py-8">Carregando...</p> : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum contrato encontrado</TableCell></TableRow>
                  ) : paginated.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <button onClick={() => navigate(`/contracts/${c.id}`)} className="text-primary hover:underline text-left">{c.name}</button>
                      </TableCell>
                      <TableCell>
                        {c.crm_accounts?.name ? (
                          <button onClick={() => navigate(`/accounts/${c.crm_accounts?.id || c.account_id}`)} className="text-primary hover:underline">{c.crm_accounts.name}</button>
                        ) : <span className="text-destructive">Sem Conta</span>}
                      </TableCell>
                      <TableCell><Badge className={statusColors[c.status] || ""}>{c.status}</Badge></TableCell>
                      <TableCell>{c.contract_type || "—"}</TableCell>
                      <TableCell>{formatCurrency(c.value, c.currency)}</TableCell>
                      <TableCell>{c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>{c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell><ExpiryBadge days={getDaysUntilExpiry(c.end_date)} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deactivateContract(c.id)} className="text-destructive"><EyeOff className="mr-2 h-4 w-4" />Desativar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <PaginationItem key={p}><PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">{p}</PaginationLink></PaginationItem>
                    ))}
                    <PaginationItem><PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
