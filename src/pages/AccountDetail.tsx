import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Power, Globe, Phone, Mail, MapPin, Building2, User, Instagram, UserCheck } from "lucide-react";
import AddressFields from "@/components/address/AddressFields";

const SEGMENTS = ["Tecnologia", "Varejo", "Serviços", "Indústria", "Saúde", "Educação", "Financeiro", "Outro"];

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

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docType, setDocType] = useState<DocType>("cnpj");
  const [form, setForm] = useState({ name: "", cnpj: "", email: "", phone: "", segment: "", website: "", instagram: "", street: "", city: "", state: "", country: "", postal_code: "", owner_user_id: "", resp_name: "", resp_cpf: "", resp_phone: "", resp_email: "" });
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ name: "", document: "", email: "", phone: "" });

  // Related data
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const fetchAccount = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("crm_accounts").select("*").eq("id", id).single();
    setAccount(data);
    setLoading(false);
  }, [id]);

  const fetchRelated = useCallback(async () => {
    if (!id) return;
    const [c, d, ct, act] = await Promise.all([
      supabase.from("contacts").select("*").eq("account_id", id).order("created_at", { ascending: false }),
      supabase.from("deals").select("*").eq("account_id", id).order("created_at", { ascending: false }),
      supabase.from("contracts").select("*").eq("account_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*, contacts(first_name, last_name)").eq("account_id", id).eq("is_active", true).order("created_at", { ascending: false }).limit(10),
    ]);
    setContacts(c.data || []);
    setDeals(d.data || []);
    setContracts(ct.data || []);
    setActivities(act.data || []);
  }, [id]);

  const fetchOwners = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email");
    setOwners(data || []);
  }, []);

  useEffect(() => { fetchAccount(); fetchRelated(); fetchOwners(); }, [fetchAccount, fetchRelated, fetchOwners]);

  const getOwnerName = (uid: string | null) => {
    if (!uid) return "—";
    const o = owners.find((p) => p.id === uid);
    return o ? (o.full_name || o.email) : "—";
  };

  const openEdit = () => {
    if (!account) return;
    const addr = account.address_json || {};
    const resp = (account as any).responsible_json || {};
    setDocType(detectDocType(account.cnpj || ""));
    setForm({
      name: account.name, cnpj: account.cnpj || "", email: account.email || "", phone: account.phone || "",
      segment: account.segment || "", website: account.website || "", instagram: (account as any).instagram || "",
      street: addr.street || "", city: addr.city || "", state: addr.state || "", country: addr.country || "", postal_code: addr.postal_code || "",
      owner_user_id: account.owner_user_id || "",
      resp_name: resp.name || "", resp_cpf: resp.cpf || "", resp_phone: resp.phone || "", resp_email: resp.email || "",
    });
    setErrors({});
    setEditOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (form.cnpj && !validateDoc(form.cnpj, docType)) {
      e.cnpj = docType === "cpf" ? "Formato: 000.000.000-00" : "Formato: 00.000.000/0000-00";
    }
    if (form.website && !validateURL(form.website)) e.website = "URL inválida";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const addressJson = (form.street || form.city || form.state || form.country || form.postal_code)
      ? { street: form.street, city: form.city, state: form.state, country: form.country, postal_code: form.postal_code } : null;
    const responsibleJson = docType === "cnpj" && (form.resp_name || form.resp_cpf || form.resp_phone || form.resp_email)
      ? { name: form.resp_name, cpf: form.resp_cpf, phone: form.resp_phone, email: form.resp_email }
      : null;
    const { error } = await supabase.from("crm_accounts").update({
      name: form.name, cnpj: form.cnpj || null, email: form.email || null, phone: form.phone || null,
      segment: form.segment || null, website: form.website || null, instagram: form.instagram || null,
      address_json: addressJson, owner_user_id: form.owner_user_id || null, responsible_json: responsibleJson,
    }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Conta atualizada!" });
    setEditOpen(false);
    fetchAccount();
  };

  const handleDeactivate = async () => {
    const { error } = await supabase.from("crm_accounts").update({ is_active: false }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Conta desativada!" });
    navigate("/accounts");
  };

  const handleConvertOpen = () => {
    if (!account) return;
    setConvertForm({
      name: account.name,
      document: account.cnpj || "",
      email: account.email || "",
      phone: account.phone || "",
    });
    setConvertDialogOpen(true);
  };

  const handleConvert = async (ev: React.FormEvent) => {
    ev.preventDefault();
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
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;
  if (!account) return <div className="flex items-center justify-center py-20 text-muted-foreground">Conta não encontrada</div>;

  const addr = account.address_json || {};
  const addressStr = [addr.street, addr.city, addr.state, addr.country, addr.postal_code].filter(Boolean).join(", ");
  const docLabel = account.cnpj ? (detectDocType(account.cnpj) === "cpf" ? "CPF" : "CNPJ") : "Documento";
  const instagramHandle = (account as any).instagram?.replace(/^@/, "") || "";
  const resp = (account as any).responsible_json || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/accounts")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />{account.name}
            </h1>
            {account.segment && <Badge variant="outline" className="mt-1">{account.segment}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
          <Button variant="outline" onClick={handleConvertOpen}><UserCheck className="mr-2 h-4 w-4" />Converter em Cliente</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive"><Power className="mr-2 h-4 w-4" />Desativar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar conta?</AlertDialogTitle>
                <AlertDialogDescription>A conta será desativada e não aparecerá mais na listagem. Essa ação pode ser revertida.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate}>Desativar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {account.cnpj && (
          <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">{docLabel}</p><p className="font-medium">{account.cnpj}</p></div>
          </CardContent></Card>
        )}
        {account.email && (
          <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">E-mail</p><p className="font-medium">{account.email}</p></div>
          </CardContent></Card>
        )}
        {account.phone && (
          <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium">{account.phone}</p></div>
          </CardContent></Card>
        )}
        {account.website && (
          <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Website</p><a href={account.website.startsWith("http") ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{account.website}</a></div>
          </CardContent></Card>
        )}
        {instagramHandle && (
          <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
            <Instagram className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Instagram</p><a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">@{instagramHandle}</a></div>
          </CardContent></Card>
        )}
        {addressStr && (
          <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Endereço</p><p className="font-medium">{addressStr}</p></div>
          </CardContent></Card>
        )}
        <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
          <User className="h-5 w-5 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Responsável</p><p className="font-medium">{getOwnerName(account.owner_user_id)}</p></div>
        </CardContent></Card>
        {resp.name && (
          <Card className="border-border bg-card"><CardContent className="p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Responsável pela Empresa</p>
              <p className="font-medium">{resp.name}</p>
              {resp.cpf && <p className="text-xs text-muted-foreground">CPF: {resp.cpf}</p>}
              {resp.phone && <p className="text-xs text-muted-foreground">Tel: {resp.phone}</p>}
              {resp.email && <p className="text-xs text-muted-foreground">{resp.email}</p>}
            </div>
          </CardContent></Card>
        )}
      </div>

      {/* Related tabs */}
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contatos ({contacts.length})</TabsTrigger>
          <TabsTrigger value="deals">Oportunidades ({deals.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contratos ({contracts.length})</TabsTrigger>
          <TabsTrigger value="activities">Atividades ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <Card className="border-border bg-card"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-border">
                <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Cargo</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum contato vinculado</TableCell></TableRow>
                ) : contacts.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="font-medium">{c.first_name} {c.last_name || ""}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.position || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card className="border-border bg-card"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-border">
                <TableHead>Nome</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Criado em</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {deals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma oportunidade vinculada</TableCell></TableRow>
                ) : deals.map((d) => (
                  <TableRow key={d.id} className="border-border cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/deals/${d.id}`)}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.estimated_value ? `R$ ${Number(d.estimated_value).toLocaleString("pt-BR")}` : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card className="border-border bg-card"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-border">
                <TableHead>Nome</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Vigência</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum contrato vinculado</TableCell></TableRow>
                ) : contracts.map((ct) => (
                  <TableRow key={ct.id} className="border-border">
                    <TableCell className="font-medium">{ct.name}</TableCell>
                    <TableCell className="text-muted-foreground">{ct.value ? `R$ ${Number(ct.value).toLocaleString("pt-BR")}` : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{ct.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">
                      {ct.start_date ? new Date(ct.start_date).toLocaleDateString("pt-BR") : "—"} — {ct.end_date ? new Date(ct.end_date).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card className="border-border bg-card"><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="border-border">
                <TableHead>Assunto</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Prazo</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma atividade vinculada</TableCell></TableRow>
                ) : activities.map((a) => (
                  <TableRow key={a.id} className="border-border cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/activities/${a.id}`)}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                    <TableCell><Badge variant={a.status === "Completed" ? "default" : "secondary"}>{a.status === "Open" ? "Aberta" : a.status === "Completed" ? "Concluída" : "Cancelada"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{a.due_at ? new Date(a.due_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Conta</DialogTitle></DialogHeader>
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
                  <Select value={docType} onValueChange={(v) => { setDocType(v as "cpf" | "cnpj"); setForm({ ...form, cnpj: "" }); }}>
                    <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    placeholder={docType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                    className="flex-1"
                  />
                </div>
                {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select value={form.segment || "__none__"} onValueChange={(v) => setForm({ ...form, segment: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <AddressFields
              postal_code={form.postal_code}
              country={form.country}
              street={form.street}
              city={form.city}
              state={form.state}
              onChange={(fields) => setForm((prev) => ({ ...prev, ...fields }))}
            />
            {docType === "cnpj" && (
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
            )}
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.owner_user_id || "__none__"} onValueChange={(v) => setForm({ ...form, owner_user_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.full_name || o.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

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
