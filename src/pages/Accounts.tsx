import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Building2, ChevronLeft, ChevronRight, UserCheck, Trash2 } from "lucide-react";
import AddressFields from "@/components/address/AddressFields";
import PasswordConfirmDialog from "@/components/finance/PasswordConfirmDialog";

const SEGMENTS = ["Tecnologia", "Varejo", "Serviços", "Indústria", "Saúde", "Educação", "Financeiro", "Outro"];
const PAGE_SIZE = 10;

import { detectDocumentType, type DocType } from "@/lib/documentMask";

function validateDoc(doc: string, type: DocType): boolean {
  if (!doc) return true;
  if (type === "nif") return doc.replace(/\D/g, "").length > 0;
  if (type === "cpf") return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(doc);
  return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(doc);
}

function validateURL(url: string): boolean {
  if (!url) return true;
  try { new URL(url.startsWith("http") ? url : `https://${url}`); return true; } catch { return false; }
}

export default function Accounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSegment, setFilterSegment] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [owners, setOwners] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [docType, setDocType] = useState<DocType>("cnpj");
  const [form, setForm] = useState({
    name: "", cnpj: "", email: "", phone: "", segment: "", website: "", instagram: "",
    street: "", city: "", state: "", country: "", postal_code: "", owner_user_id: "",
    resp_name: "", resp_cpf: "", resp_phone: "", resp_email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingAccount, setConvertingAccount] = useState<any>(null);
  const [convertForm, setConvertForm] = useState({ name: "", document: "", email: "", phone: "" });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("crm_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  }, []);

  const fetchOwners = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email");
    setOwners(data || []);
  }, []);

  useEffect(() => { fetchData(); fetchOwners(); }, [fetchData, fetchOwners]);

  const openCreate = () => {
    setEditingId(null);
    setDocType("cnpj" as DocType);
    setForm({ name: "", cnpj: "", email: "", phone: "", segment: "", website: "", instagram: "", street: "", city: "", state: "", country: "", postal_code: "", owner_user_id: "", resp_name: "", resp_cpf: "", resp_phone: "", resp_email: "" });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setDocType(detectDocumentType(a.cnpj || ""));
    const addr = a.address_json || {};
    const resp = (a as any).responsible_json || {};
    setForm({
      name: a.name,
      cnpj: a.cnpj || "",
      email: a.email || "",
      phone: a.phone || "",
      segment: a.segment || "",
      website: a.website || "",
      instagram: (a as any).instagram || "",
      street: addr.street || "",
      city: addr.city || "",
      state: addr.state || "",
      country: addr.country || "",
      postal_code: addr.postal_code || "",
      owner_user_id: a.owner_user_id || "",
      resp_name: resp.name || "",
      resp_cpf: resp.cpf || "",
      resp_phone: resp.phone || "",
      resp_email: resp.email || "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (form.cnpj && !validateDoc(form.cnpj, docType)) {
      e.cnpj = docType === "cpf" ? "Formato: 000.000.000-00" : docType === "cnpj" ? "Formato: 00.000.000/0000-00" : "Informe o NIF";
    }
    if (form.website && !validateURL(form.website)) e.website = "URL inválida";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const addressJson = (form.street || form.city || form.state || form.country || form.postal_code)
      ? { street: form.street, city: form.city, state: form.state, country: form.country, postal_code: form.postal_code }
      : null;

    const responsibleJson = docType === "cnpj" && (form.resp_name || form.resp_cpf || form.resp_phone || form.resp_email)
      ? { name: form.resp_name, cpf: form.resp_cpf, phone: form.resp_phone, email: form.resp_email }
      : null;

    const payload: any = {
      name: form.name,
      cnpj: form.cnpj || null,
      email: form.email || null,
      phone: form.phone || null,
      segment: form.segment || null,
      website: form.website || null,
      instagram: form.instagram || null,
      address_json: addressJson,
      owner_user_id: form.owner_user_id || null,
      responsible_json: responsibleJson,
    };

    if (editingId) {
      const { error } = await supabase.from("crm_accounts").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Conta atualizada!" });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) return;
      const { error } = await supabase.from("crm_accounts").insert({ ...payload, tenant_id: profile.tenant_id });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Conta criada!" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleConvertOpen = (a: any) => {
    setConvertingAccount(a);
    setConvertForm({
      name: a.name,
      document: a.cnpj || "",
      email: a.email || "",
      phone: a.phone || "",
    });
    setConvertDialogOpen(true);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingAccount) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", u.id).single();
    if (!profile) return;
    const { error } = await supabase.from("customers").insert({
      tenant_id: profile.tenant_id,
      name: convertForm.name,
      document: convertForm.document || null,
      email: convertForm.email || null,
      phone: convertForm.phone || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Conta convertida em cliente!" });
    setConvertDialogOpen(false);
    setConvertingAccount(null);
  };

  const filtered = accounts.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || (a.cnpj || "").includes(search) || (a.email || "").toLowerCase().includes(search.toLowerCase());
    const matchSegment = filterSegment === "all" || a.segment === filterSegment;
    const matchOwner = filterOwner === "all" || a.owner_user_id === filterOwner;
    return matchSearch && matchSegment && matchOwner;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filterSegment, filterOwner]);

  const getOwnerName = (id: string | null) => {
    if (!id) return "—";
    const o = owners.find((p) => p.id === id);
    return o ? (o.full_name || o.email) : "—";
  };

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
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Documento</Label>
                <div className="flex gap-2">
                  <Select value={docType} onValueChange={(v) => { setDocType(v as DocType); setForm({ ...form, cnpj: "" }); }}>
                    <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="nif">NIF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    placeholder={docType === "cpf" ? "000.000.000-00" : docType === "cnpj" ? "00.000.000/0000-00" : "Número de Identificação Fiscal"}
                    className="flex-1"
                  />
                </div>
                {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://exemplo.com" />
                {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@perfil" />
              </div>
            </div>
            {docType === "cnpj" && (
              <>
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Responsável pela Empresa</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nome do Responsável</Label><Input value={form.resp_name} onChange={(e) => setForm({ ...form, resp_name: e.target.value })} placeholder="Nome completo" /></div>
                    <div className="space-y-2"><Label>CPF do Responsável</Label><Input value={form.resp_cpf} onChange={(e) => setForm({ ...form, resp_cpf: e.target.value })} placeholder="000.000.000-00" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Telefone do Responsável</Label><Input value={form.resp_phone} onChange={(e) => setForm({ ...form, resp_phone: e.target.value })} placeholder="(00) 00000-0000" /></div>
                    <div className="space-y-2"><Label>E-mail do Responsável</Label><Input type="email" value={form.resp_email} onChange={(e) => setForm({ ...form, resp_email: e.target.value })} placeholder="email@empresa.com" /></div>
                  </div>
                </div>
              </>
            )}
            <AddressFields
              postal_code={form.postal_code}
              country={form.country}
              street={form.street}
              city={form.city}
              state={form.state}
              onChange={(fields) => setForm((prev) => ({ ...prev, ...fields }))}
            />
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.owner_user_id || "__none__"} onValueChange={(v) => setForm({ ...form, owner_user_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name || o.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">{editingId ? "Salvar" : "Criar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, documento ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSegment} onValueChange={setFilterSegment}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterOwner} onValueChange={setFilterOwner}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name || o.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Empresa</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
              ) : paginated.map((a) => (
                <TableRow key={a.id} className="border-border">
                  <TableCell className="font-medium">
                    <button onClick={() => navigate(`/accounts/${a.id}`)} className="flex items-center gap-2 hover:text-primary transition-colors text-left">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="underline-offset-2 hover:underline">{a.name}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.cnpj || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.phone || "—"}</TableCell>
                  <TableCell>{a.segment ? <Badge variant="outline">{a.segment}</Badge> : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{getOwnerName(a.owner_user_id)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEdit(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Converter em Cliente" onClick={() => handleConvertOpen(a)}>
                        <UserCheck className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} conta(s) — Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Próxima<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Convert to Customer Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Converter em Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleConvert} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={convertForm.name} onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ</Label>
              <Input value={convertForm.document} onChange={(e) => setConvertForm({ ...convertForm, document: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={convertForm.email} onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={convertForm.phone} onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              <UserCheck className="mr-2 h-4 w-4" />Converter em Cliente
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
