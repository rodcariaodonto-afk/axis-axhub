import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, Navigate } from "react-router-dom";

interface DocForm {
  id?: string;
  title: string;
  slug: string;
  description: string;
  niche: string;
  category: string;
  subcategory: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  is_published: boolean;
  is_featured: boolean;
  order_index: number;
}

const emptyForm: DocForm = {
  title: "", slug: "", description: "", niche: "", category: "", subcategory: "",
  content: "", meta_title: "", meta_description: "", keywords: "",
  is_published: false, is_featured: false, order_index: 0,
};

export default function DocumentationAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["admin-documentation"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("documentation").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil não encontrado");
      const payload = {
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: form.description || null,
        niche: form.niche,
        category: form.category,
        subcategory: form.subcategory || null,
        content: form.content,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        keywords: form.keywords ? form.keywords.split(",").map((k) => k.trim()) : [],
        is_published: form.is_published,
        is_featured: form.is_featured,
        order_index: form.order_index,
        tenant_id: profile.tenant_id,
        updated_by: user!.id,
      };

      if (editing && form.id) {
        const { error } = await supabase.from("documentation").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("documentation").insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documentation"] });
      queryClient.invalidateQueries({ queryKey: ["documentation"] });
      toast.success(editing ? "Artigo atualizado!" : "Artigo criado!");
      setDialogOpen(false);
      setForm(emptyForm);
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentation").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documentation"] });
      toast.success("Artigo excluído!");
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      await supabase.from("documentation").update({ is_published: !published, updated_by: user!.id }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documentation"] });
      queryClient.invalidateQueries({ queryKey: ["documentation"] });
    },
  });

  if (adminLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/documentation" replace />;

  const openEdit = (doc: any) => {
    setForm({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      description: doc.description || "",
      niche: doc.niche,
      category: doc.category,
      subcategory: doc.subcategory || "",
      content: doc.content,
      meta_title: doc.meta_title || "",
      meta_description: doc.meta_description || "",
      keywords: (doc.keywords || []).join(", "),
      is_published: doc.is_published,
      is_featured: doc.is_featured,
      order_index: doc.order_index,
    });
    setEditing(true);
    setDialogOpen(true);
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditing(false);
    setDialogOpen(true);
  };

  const updateField = (field: keyof DocForm, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/documentation">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gerenciar Documentação</h1>
            <p className="text-muted-foreground">{docs.length} artigos</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Artigo</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc: any) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell><Badge variant="outline">{doc.niche}</Badge></TableCell>
                  <TableCell>{doc.category}</TableCell>
                  <TableCell>
                    <Badge variant={doc.is_published ? "default" : "secondary"}>
                      {doc.is_published ? "Publicado" : "Rascunho"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePublish.mutate({ id: doc.id, published: doc.is_published })}
                        title={doc.is_published ? "Despublicar" : "Publicar"}
                      >
                        {doc.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(doc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum artigo criado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="gerado-automaticamente" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => updateField("description", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nicho *</Label>
                <Input value={form.niche} onChange={(e) => updateField("niche", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Input value={form.category} onChange={(e) => updateField("category", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Input value={form.subcategory} onChange={(e) => updateField("subcategory", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo (Markdown) *</Label>
              <Textarea value={form.content} onChange={(e) => updateField("content", e.target.value)} rows={12} className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta Title (SEO)</Label>
                <Input value={form.meta_title} onChange={(e) => updateField("meta_title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Meta Description (SEO)</Label>
                <Input value={form.meta_description} onChange={(e) => updateField("meta_description", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keywords (separadas por vírgula)</Label>
              <Input value={form.keywords} onChange={(e) => updateField("keywords", e.target.value)} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => updateField("is_published", v)} />
                <Label>Publicado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => updateField("is_featured", v)} />
                <Label>Destaque</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Ordem</Label>
                <Input type="number" value={form.order_index} onChange={(e) => updateField("order_index", Number(e.target.value))} className="w-20" />
              </div>
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.title || !form.niche || !form.category || !form.content || saveMutation.isPending}
            >
              {editing ? "Salvar Alterações" : "Criar Artigo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
