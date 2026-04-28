import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Eye, MessageSquare, Share2, Trash2, FileText, ClipboardList, BarChart3, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EDUCATION_FORM_CONFIG } from "@/components/forms/formSeedData";
import { DISCOVERY_IA_FORM_CONFIG } from "@/components/forms/discoverySeedData";
import { FormShareDialog } from "@/components/forms/FormShareDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Forms() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [shareFormId, setShareFormId] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState("");
  const [formData, setFormData] = useState({ name: "", description: "", category: "other" });

  const { data: forms, isLoading } = useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("forms")
        .select("*, form_responses(count)")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["forms-stats"],
    queryFn: async () => {
      const { data: allForms } = await supabase.from("forms").select("id, status");
      const { data: allResponses } = await supabase.from("form_responses").select("id, completed");
      const total = allForms?.length || 0;
      const active = allForms?.filter((f: any) => f.status === "published").length || 0;
      const totalResponses = allResponses?.length || 0;
      const completedResponses = allResponses?.filter((r: any) => r.completed).length || 0;
      const rate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;
      return { total, active, totalResponses, rate };
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id, id").eq("id", user.id).single();
    if (!profile) return;
    const { error } = await supabase.from("forms").insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      form_config: [],
      status: "draft",
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Formulário criado!" });
    setCreateOpen(false);
    setFormData({ name: "", description: "", category: "other" });
    qc.invalidateQueries({ queryKey: ["forms"] });
    qc.invalidateQueries({ queryKey: ["forms-stats"] });
  };

  const handleSeedForm = async (template: "education" | "discovery") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" }); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id, id").eq("id", user.id).maybeSingle();
    if (!profile) { toast({ title: "Erro", description: "Perfil não encontrado. Verifique se seu usuário está configurado corretamente.", variant: "destructive" }); return; }

    const templates = {
      education: {
        name: "Avaliação de Educação Inclusiva",
        description: "Formulário para avaliar necessidades e oportunidades em educação inclusiva",
        category: "prospecting",
        config: EDUCATION_FORM_CONFIG,
      },
      discovery: {
        name: "Questionário de Discovery — Solução de IA para Transcrição e Análise Comercial de Chamadas",
        description: "Levantamento técnico, operacional e de negócio para solução de IA de transcrição e análise de chamadas (Yeastar + Microsoft).",
        category: "prospecting",
        config: DISCOVERY_IA_FORM_CONFIG,
      },
    };
    const t = templates[template];

    const { error } = await supabase.from("forms").insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      name: t.name,
      description: t.description,
      category: t.category,
      form_config: t.config as any,
      status: "published",
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Formulário modelo criado!" });
    qc.invalidateQueries({ queryKey: ["forms"] });
    qc.invalidateQueries({ queryKey: ["forms-stats"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este formulário e todas as respostas?")) return;
    await supabase.from("forms").delete().eq("id", id);
    toast({ title: "Formulário excluído" });
    qc.invalidateQueries({ queryKey: ["forms"] });
    qc.invalidateQueries({ queryKey: ["forms-stats"] });
  };

  const filtered = (forms || []).filter((f: any) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statCards = [
    { label: "Total de Formulários", value: stats?.total || 0, icon: ClipboardList, color: "text-blue-500" },
    { label: "Respostas Recebidas", value: stats?.totalResponses || 0, icon: MessageSquare, color: "text-green-500" },
    { label: "Taxa de Conclusão", value: `${stats?.rate || 0}%`, icon: CheckCircle, color: "text-purple-500" },
    { label: "Formulários Ativos", value: stats?.active || 0, icon: BarChart3, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Formulários</h1>
          <p className="text-muted-foreground">Crie e gerencie formulários para coletar informações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedForm}>
            <FileText className="mr-2 h-4 w-4" />Criar Formulário Modelo
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Criar Novo Formulário
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar formulário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Nome</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Respostas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum formulário encontrado</TableCell></TableRow>
              ) : filtered.map((f: any) => (
                <TableRow key={f.id} className="border-border">
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(f.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{f.form_responses?.[0]?.count || 0}</TableCell>
                  <TableCell>
                    <Badge variant={f.status === "published" ? "default" : f.status === "draft" ? "secondary" : "outline"}>
                      {f.status === "published" ? "Publicado" : f.status === "draft" ? "Rascunho" : "Arquivado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/forms/${f.id}/edit`)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/forms/${f.id}/responses`)} title="Respostas">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShareFormId(f.id); setShareCode(f.unique_code); }} title="Compartilhar">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(f.id)} title="Deletar">
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo Formulário</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Ex: Pesquisa de Satisfação" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição do formulário" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecção</SelectItem>
                  <SelectItem value="survey">Pesquisa</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Criar Formulário</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <FormShareDialog open={!!shareFormId} onOpenChange={() => setShareFormId(null)} uniqueCode={shareCode} />
    </div>
  );
}
