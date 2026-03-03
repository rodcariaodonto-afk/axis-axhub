import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Save, GripVertical } from "lucide-react";
import type { FormQuestion } from "@/components/forms/formSeedData";


export default function FormEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editQ, setEditQ] = useState<FormQuestion | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: form, isLoading } = useQuery({
    queryKey: ["form", id],
    queryFn: async () => {
      const { data } = await supabase.from("forms").select("*").eq("id", id!).single();
      return data as any;
    },
  });

  const { data: funis } = useQuery({
    queryKey: ["funis-for-form"],
    queryFn: async () => {
      const { data } = await supabase.from("funis" as any).select("id, nome").eq("status", "ativo");
      return (data || []) as unknown as { id: string; nome: string }[];
    },
  });

  const questions: FormQuestion[] = form?.form_config || [];
  const sections = [...new Set(questions.map((q) => q.section))];

  const updateForm = async (updates: any) => {
    const { error } = await supabase.from("forms").update(updates).eq("id", id!);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["form", id] });
  };

  const saveQuestion = () => {
    if (!editQ) return;
    const updated = questions.map((q) => q.id === editQ.id ? editQ : q);
    const isNew = !questions.find((q) => q.id === editQ.id);
    const config = isNew ? [...questions, editQ] : updated;
    updateForm({ form_config: config });
    setEditOpen(false);
    toast({ title: "Pergunta salva!" });
  };

  const deleteQuestion = (qId: string) => {
    if (!confirm("Excluir esta pergunta?")) return;
    updateForm({ form_config: questions.filter((q) => q.id !== qId) });
    toast({ title: "Pergunta excluída" });
  };

  const addQuestion = () => {
    setEditQ({
      id: `q_${Date.now()}`,
      section: sections[0] || "Nova Seção",
      label: "",
      type: "text",
      required: false,
    });
    setEditOpen(true);
  };

  const toggleStatus = () => {
    const newStatus = form?.status === "published" ? "draft" : "published";
    updateForm({ status: newStatus });
    toast({ title: newStatus === "published" ? "Formulário publicado!" : "Formulário despublicado" });
  };

  if (isLoading) return <div className="flex justify-center py-16"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!form) return <p className="text-center py-16 text-muted-foreground">Formulário não encontrado</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/forms")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Editar Formulário</h1>
          <p className="text-muted-foreground">{form.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={form.status === "published"} onCheckedChange={toggleStatus} />
            <Label>{form.status === "published" ? "Publicado" : "Rascunho"}</Label>
          </div>
        </div>
      </div>

      {/* Form metadata */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome do Formulário</Label>
              <Input defaultValue={form.name} onBlur={(e) => updateForm({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input defaultValue={form.description || ""} onBlur={(e) => updateForm({ description: e.target.value || null })} />
            </div>
            <div className="space-y-2">
              <Label>Funil de Venda (opcional)</Label>
              <Select
                value={form.funil_id || "none"}
                onValueChange={(v) => updateForm({ funil_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {(funis || []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Ao receber resposta, o funil será iniciado automaticamente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions by section */}
      {sections.map((section) => (
        <Card key={section} className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">{section}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.filter((q) => q.section === section).map((q, idx) => (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{q.label}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{q.type}</Badge>
                    {q.required && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
                    {q.conditionalOn && <Badge variant="outline" className="text-xs">Condicional</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setEditQ({ ...q }); setEditOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button onClick={addQuestion} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />Adicionar Pergunta
      </Button>

      {/* Edit Question Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Editar Pergunta</DialogTitle></DialogHeader>
          {editQ && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Texto da Pergunta</Label>
                <Textarea value={editQ.label} onChange={(e) => setEditQ({ ...editQ, label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editQ.type} onValueChange={(v: any) => setEditQ({ ...editQ, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto curto</SelectItem>
                      <SelectItem value="textarea">Texto longo</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="radio">Múltipla escolha</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="select">Lista de seleção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Seção</Label>
                  <Input value={editQ.section} onChange={(e) => setEditQ({ ...editQ, section: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editQ.required} onCheckedChange={(v) => setEditQ({ ...editQ, required: v })} />
                <Label>Obrigatório</Label>
              </div>
              {(editQ.type === "radio" || editQ.type === "checkbox" || editQ.type === "select") && (
                <div className="space-y-2">
                  <Label>Opções (uma por linha)</Label>
                  <Textarea
                    value={(editQ.options || []).join("\n")}
                    onChange={(e) => setEditQ({ ...editQ, options: e.target.value.split("\n").filter(Boolean) })}
                    rows={5}
                    placeholder={"Opção 1\nOpção 2\nOpção 3"}
                  />
                </div>
              )}
              <Button onClick={saveQuestion} className="w-full"><Save className="mr-2 h-4 w-4" />Salvar Pergunta</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
