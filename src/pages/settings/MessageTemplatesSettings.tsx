import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[] | null;
  created_at: string;
}

export default function MessageTemplatesSettings() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", variables: "" });
  const { toast } = useToast();

  const fetchTemplates = async () => {
    const { data } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openNew = () => {
    setEditingTemplate(null);
    setForm({ name: "", subject: "", body: "", variables: "" });
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      subject: t.subject,
      body: t.body,
      variables: (t.variables || []).join(", "),
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const vars = form.variables.split(",").map((v) => v.trim()).filter(Boolean);

    if (editingTemplate) {
      const { error } = await supabase.from("email_templates").update({
        name: form.name,
        subject: form.subject,
        body: form.body,
        variables: vars,
      }).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Template atualizado!" });
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (!profile) return;
      const { error } = await supabase.from("email_templates").insert({
        tenant_id: profile.tenant_id,
        name: form.name,
        subject: form.subject,
        body: form.body,
        variables: vars,
      });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Template criado!" });
    }
    setDialogOpen(false);
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", deleteTemplate.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Template excluído!" });
    setDeleteTemplate(null);
    fetchTemplates();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates de Mensagens</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus templates para e-mail, WhatsApp e SMS</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo Template</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Nenhum template cadastrado</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="border-border bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{t.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{t.subject}</p>
                  {t.variables && t.variables.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {t.variables.map((v) => <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTemplate(t)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTemplate(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Boas-vindas" />
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="Ex: Bem-vindo à nossa plataforma!" />
            </div>
            <div className="space-y-2">
              <Label>Corpo da mensagem</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
                placeholder="Olá {{nome}}, seja bem-vindo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Variáveis (separadas por vírgula)</Label>
              <Input value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} placeholder="nome, email, empresa" />
              <p className="text-xs text-muted-foreground">Use no corpo como {"{{variavel}}"}</p>
            </div>
            <Button type="submit" className="w-full">{editingTemplate ? "Salvar Alterações" : "Criar Template"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Preview: {previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assunto</p>
              <p className="text-sm">{previewTemplate?.subject}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Corpo</p>
              <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">{previewTemplate?.body}</div>
            </div>
            {previewTemplate?.variables && previewTemplate.variables.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Variáveis</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {previewTemplate.variables.map((v) => <Badge key={v} variant="outline" className="text-xs">{v}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(o) => !o && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTemplate?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
