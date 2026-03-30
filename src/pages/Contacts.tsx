import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, Pencil, Trash2, UserCheck, AlertTriangle, Copy } from "lucide-react";
import { formatDocument } from "@/lib/documentMask";

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", position: "", account_id: "", is_primary: false });
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "", phone: "", position: "", account_id: "", is_primary: false });

  const [deleteContact, setDeleteContact] = useState<any>(null);

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingContact, setConvertingContact] = useState<any>(null);
  const [convertForm, setConvertForm] = useState({ name: "", document: "", email: "", phone: "" });

  const [dedupDialogOpen, setDedupDialogOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<{ key: string; contacts: any[] }[]>([]);

  const findDuplicates = () => {
    const groups: Record<string, any[]> = {};
    contacts.forEach((c) => {
      const key = `${(c.first_name || "").toLowerCase().trim()}|${(c.last_name || "").toLowerCase().trim()}|${(c.email || "").toLowerCase().trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    const dups = Object.entries(groups)
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => ({ key, contacts: arr.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) }));
    setDuplicateGroups(dups);
    if (dups.length === 0) {
      toast({ title: "Nenhum duplicado encontrado", description: "Todos os contatos são únicos." });
    } else {
      setDedupDialogOpen(true);
    }
  };

  const removeDuplicates = async () => {
    const idsToRemove = duplicateGroups.flatMap((g) => g.contacts.slice(1).map((c) => c.id));
    if (idsToRemove.length === 0) return;
    const { error } = await supabase.from("contacts").delete().in("id", idsToRemove);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${idsToRemove.length} contato(s) duplicado(s) removido(s)!` });
    setDedupDialogOpen(false);
    setDuplicateGroups([]);
    fetchData();
  };

  const fetchData = useCallback(async () => {
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("contacts").select("*, crm_accounts(id, name)").order("created_at", { ascending: false }),
      supabase.from("crm_accounts").select("id, name").eq("is_active", true).order("name"),
    ]);
    setContacts(c || []);
    setAccounts(a || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_id) {
      toast({ title: "Conta obrigatória", description: "Selecione uma conta antes de criar o contato.", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;
    const { error } = await supabase.from("contacts").insert({
      tenant_id: profile.tenant_id,
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      position: form.position || null,
      account_id: form.account_id,
      is_primary: form.is_primary,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contato criado!" });
    setForm({ first_name: "", last_name: "", email: "", phone: "", position: "", account_id: "", is_primary: false });
    setDialogOpen(false);
    fetchData();
  };

  const handleEditOpen = (c: any) => {
    setEditingContact(c);
    setEditForm({
      first_name: c.first_name,
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      position: c.position || "",
      account_id: c.account_id || "",
      is_primary: c.is_primary || false,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    if (!editForm.account_id) {
      toast({ title: "Conta obrigatória", description: "Selecione uma conta antes de salvar.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("contacts").update({
      first_name: editForm.first_name,
      last_name: editForm.last_name || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      position: editForm.position || null,
      account_id: editForm.account_id,
      is_primary: editForm.is_primary,
    }).eq("id", editingContact.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contato atualizado!" });
    setEditDialogOpen(false);
    setEditingContact(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteContact) return;
    const { error } = await supabase.from("contacts").delete().eq("id", deleteContact.id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contato excluído!" });
    setDeleteContact(null);
    fetchData();
  };

  const handleConvertOpen = (c: any) => {
    setConvertingContact(c);
    setConvertForm({
      name: `${c.first_name} ${c.last_name || ""}`.trim(),
      document: "",
      email: c.email || "",
      phone: c.phone || "",
    });
    setConvertDialogOpen(true);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingContact) return;
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
    toast({ title: "Contato convertido em cliente!" });
    setConvertDialogOpen(false);
    setConvertingContact(null);
  };

  const filtered = contacts.filter((c) => {
    const matchSearch = `${c.first_name} ${c.last_name || ""} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchAccount = filterAccount === "all" || c.account_id === filterAccount;
    return matchSearch && matchAccount;
  });

  const noAccounts = accounts.length === 0 && !loading;

  const contactFormFields = (formState: typeof form, setFormState: (f: typeof form) => void) => (
    <>
      {/* Conta primeiro */}
      <div className="space-y-2">
        <Label>Conta *</Label>
        {noAccounts ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>
              Você precisa criar uma conta primeiro.{" "}
              <button type="button" className="underline font-medium text-primary" onClick={() => navigate("/accounts")}>
                Ir para Contas
              </button>
            </span>
          </div>
        ) : (
          <Select value={formState.account_id} onValueChange={(v) => setFormState({ ...formState, account_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione uma conta..." /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {!formState.account_id && !noAccounts && <p className="text-xs text-destructive">Conta é obrigatória</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Nome *</Label><Input value={formState.first_name} onChange={(e) => setFormState({ ...formState, first_name: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Sobrenome</Label><Input value={formState.last_name} onChange={(e) => setFormState({ ...formState, last_name: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} /></div>
        <div className="space-y-2"><Label>Telefone</Label><Input value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Cargo</Label><Input value={formState.position} onChange={(e) => setFormState({ ...formState, position: e.target.value })} /></div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground">Gerencie os contatos do CRM</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={findDuplicates}>
            <Copy className="mr-2 h-4 w-4" />Excluir Duplicados
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={noAccounts}><Plus className="mr-2 h-4 w-4" />Novo Contato</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {contactFormFields(form, setForm)}
              <Button type="submit" className="w-full" disabled={!form.account_id}>Criar Contato</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {noAccounts && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm">
              Nenhuma conta cadastrada. Você precisa{" "}
              <button className="underline font-medium text-primary" onClick={() => navigate("/accounts")}>criar uma conta</button>{" "}
              antes de adicionar contatos.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Conta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Nome</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum contato encontrado</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {c.first_name} {c.last_name || ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.account_id && c.crm_accounts?.name ? (
                      <button
                        className="text-primary hover:underline font-medium text-left"
                        onClick={() => navigate(`/accounts/${c.account_id}`)}
                      >
                        {c.crm_accounts.name}
                      </button>
                    ) : (
                      <span className="text-destructive text-sm">Sem Conta</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.position || "—"}</TableCell>
                  <TableCell>{c.is_primary ? <Badge variant="default">Principal</Badge> : <Badge variant="secondary">Contato</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => handleEditOpen(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Converter em Cliente" onClick={() => handleConvertOpen(c)}>
                        <UserCheck className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir" onClick={() => setDeleteContact(c)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Editar Contato</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            {contactFormFields(editForm, setEditForm)}
            <Button type="submit" className="w-full" disabled={!editForm.account_id}>Salvar Alterações</Button>
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
              <Input value={convertForm.document} onChange={(e) => setConvertForm({ ...convertForm, document: formatDocument(e.target.value) })} placeholder="Opcional" />
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContact} onOpenChange={(open) => !open && setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteContact?.first_name} {deleteContact?.last_name || ""}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
