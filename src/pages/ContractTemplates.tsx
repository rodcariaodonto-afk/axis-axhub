import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreHorizontal, Pencil, Copy, EyeOff, Trash2, Code, PackagePlus } from "lucide-react";
import { macroCategories, replaceMacros } from "@/lib/contractMacros";
import { seedContractTemplates } from "@/lib/contractTemplateSeed";
import { getUserProfile } from "@/lib/getUserTenantId";

const typeOptions = [
  { value: "sales", label: "Venda" },
  { value: "service", label: "Serviço" },
  { value: "supply", label: "Fornecimento" },
  { value: "nda", label: "NDA" },
  { value: "custom", label: "Customizado" },
];
const typeLabels: Record<string, string> = Object.fromEntries(typeOptions.map(t => [t.value, t.label]));
const PER_PAGE = 10;

const emptyForm = {
  name: "", description: "", type: "custom", content: "", is_active: true,
};

export default function ContractTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("contract_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const seedTemplates = async () => {
    const profile = await getUserProfile();
    if (!profile) { toast({ title: "Erro ao obter perfil", variant: "destructive" }); return; }
    const { data: existing } = await supabase
      .from("contract_templates")
      .select("name")
      .in("name", seedContractTemplates.map(t => t.name));
    const existingNames = new Set((existing || []).map((e: any) => e.name));
    const toInsert = seedContractTemplates
      .filter(t => !existingNames.has(t.name))
      .map(t => ({ ...t, tenant_id: profile.tenant_id, created_by: profile.id }));
    if (toInsert.length === 0) {
      toast({ title: "Templates modelo já existem" });
      return;
    }
    const { error } = await supabase.from("contract_templates").insert(toInsert as any);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: `${toInsert.length} templates modelo criados!` }); fetchData(); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({ name: t.name, description: t.description || "", type: t.type, content: t.content, is_active: t.is_active });
    setDialogOpen(true);
  };

  const duplicate = async (t: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;
    const { error } = await supabase.from("contract_templates").insert({
      tenant_id: profile.tenant_id, name: `${t.name} (cópia)`, description: t.description,
      type: t.type, content: t.content, is_active: true, created_by: user.id,
    } as any);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Template duplicado!" }); fetchData(); }
  };

  const toggleActive = async (t: any) => {
    const { error } = await supabase.from("contract_templates").update({ is_active: !t.is_active } as any).eq("id", t.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: t.is_active ? "Template desativado" : "Template ativado" }); fetchData(); }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("contract_templates").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Template excluído!" }); setDeleteConfirm(null); fetchData(); }
  };

  const insertMacro = (macroKey: string) => {
    const el = contentRef.current;
    if (!el) { setForm(f => ({ ...f, content: f.content + `{{${macroKey}}}` })); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = form.content;
    const macro = `{{${macroKey}}}`;
    const newContent = text.substring(0, start) + macro + text.substring(end);
    setForm(f => ({ ...f, content: newContent }));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + macro.length, start + macro.length); }, 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    if (!form.content.trim()) { toast({ title: "Conteúdo obrigatório", variant: "destructive" }); return; }

    if (editingId) {
      const { error } = await supabase.from("contract_templates").update({
        name: form.name, description: form.description || null, type: form.type,
        content: form.content, is_active: form.is_active,
      } as any).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Template atualizado!" }); setDialogOpen(false); fetchData(); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) return;
      const { error } = await supabase.from("contract_templates").insert({
        tenant_id: profile.tenant_id, name: form.name, description: form.description || null,
        type: form.type, content: form.content, is_active: form.is_active, created_by: user.id,
      } as any);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Template criado!" }); setDialogOpen(false); fetchData(); }
    }
  };

  const filtered = templates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.type === filterType;
    const matchActive = filterActive === "all" || (filterActive === "active" ? t.is_active : !t.is_active);
    return matchSearch && matchType && matchActive;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterType, filterActive]);

  const previewContent = replaceMacros(form.content, {
    account: { name: "Empresa Exemplo LTDA", cnpj: "12.345.678/0001-90", phone: "(11) 99999-0000", email: "contato@exemplo.com" },
    contact: { first_name: "João", last_name: "Silva", email: "joao@exemplo.com", phone: "(11) 98888-0000", position: "Diretor" },
    deal: { name: "Projeto X", estimated_value: 50000, status: "won" },
    contract: { name: "Contrato Demo", contract_type: "Serviço", value: 50000, currency: "BRL", start_date: "2026-01-01", end_date: "2026-12-31" },
    user: { full_name: "Admin", email: "admin@exemplo.com" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates de Contratos</h1>
          <p className="text-muted-foreground">Crie e gerencie modelos reutilizáveis com macros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seedTemplates}><PackagePlus className="mr-2 h-4 w-4" />Criar Templates Modelo</Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Template</Button>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 500) })} placeholder="Breve descrição do template..." /><span className="text-xs text-muted-foreground">{form.description.length}/500</span></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo *</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm"><Code className="mr-2 h-3 w-3" />Inserir Macro</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {macroCategories.map((cat) => (
                      <DropdownMenuSub key={cat.label}>
                        <DropdownMenuSubTrigger>{cat.label}</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {cat.macros.map((m) => (
                              <DropdownMenuItem key={m.key} onClick={() => insertMacro(m.key)}>
                                <code className="mr-2 text-xs text-muted-foreground">{`{{${m.key}}}`}</code>
                                {m.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Textarea ref={contentRef} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} placeholder="Digite o conteúdo do template usando macros {{macro_name}}..." className="font-mono text-sm" />
            </div>
            {form.content && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border border-border rounded-md p-4 bg-muted/30 whitespace-pre-wrap text-sm max-h-[200px] overflow-y-auto">{previewContent}</div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Template ativo</Label>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteTemplate(deleteConfirm)}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters + Table */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar templates..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos Tipos</SelectItem>{typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem></SelectContent>
            </Select>
          </div>
          {loading ? <p className="text-muted-foreground text-center py-8">Carregando...</p> : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum template encontrado</TableCell></TableRow>
                  ) : paginated.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[t.type] || t.type}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{t.description || "—"}</TableCell>
                      <TableCell>{t.is_active ? <Badge className="bg-green-500/20 text-green-400">Ativo</Badge> : <Badge className="bg-muted text-muted-foreground">Inativo</Badge>}</TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(t)}><Copy className="mr-2 h-4 w-4" />Duplicar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(t)}><EyeOff className="mr-2 h-4 w-4" />{t.is_active ? "Desativar" : "Ativar"}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm(t.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
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
                    <PaginationItem><PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} /></PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <PaginationItem key={i}><PaginationLink isActive={page === i + 1} onClick={() => setPage(i + 1)}>{i + 1}</PaginationLink></PaginationItem>
                    ))}
                    <PaginationItem><PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} /></PaginationItem>
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
