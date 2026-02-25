import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Settings2 } from "lucide-react";

const OBJECTS = [
  { value: "accounts", label: "Contas" },
  { value: "contacts", label: "Contatos" },
  { value: "deals", label: "Negócios" },
  { value: "contracts", label: "Contratos" },
];

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "picklist", label: "Lista de opções" },
  { value: "checkbox", label: "Checkbox" },
];

export default function GenericCustomFieldsSettings() {
  const qc = useQueryClient();
  const [selectedObject, setSelectedObject] = useState("accounts");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ field_name: "", field_label: "", field_type: "text", is_required: false, picklist_values: "" });

  const { data: fields, isLoading } = useQuery({
    queryKey: ["custom-fields", selectedObject],
    queryFn: async () => {
      const { data } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("object_name", selectedObject)
        .order("sort_order");
      return data || [];
    },
  });

  const openCreate = () => {
    setForm({ field_name: "", field_label: "", field_type: "text", is_required: false, picklist_values: "" });
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;

    const fieldName = form.field_name || form.field_label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const picklistValues = form.field_type === "picklist" && form.picklist_values
      ? form.picklist_values.split("\n").map((v) => v.trim()).filter(Boolean)
      : null;

    const { error } = await supabase.from("custom_fields").insert({
      tenant_id: profile.tenant_id,
      object_name: selectedObject,
      field_name: fieldName,
      field_label: form.field_label,
      field_type: form.field_type,
      is_required: form.is_required,
      picklist_values: picklistValues,
      sort_order: (fields?.length || 0) + 1,
    });

    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campo criado!" });
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["custom-fields"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este campo customizado? Os valores associados também serão removidos.")) return;
    await supabase.from("custom_fields").delete().eq("id", id);
    toast({ title: "Campo excluído" });
    qc.invalidateQueries({ queryKey: ["custom-fields"] });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Campos Customizados (CRM)
        </CardTitle>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" />Novo Campo</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {OBJECTS.map((obj) => (
            <Button key={obj.value} variant={selectedObject === obj.value ? "default" : "outline"} size="sm" onClick={() => setSelectedObject(obj.value)}>
              {obj.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : fields?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum campo customizado para {OBJECTS.find((o) => o.value === selectedObject)?.label}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields?.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.field_label}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{f.field_name}</TableCell>
                  <TableCell><Badge variant="outline">{FIELD_TYPES.find((t) => t.value === f.field_type)?.label || f.field_type}</Badge></TableCell>
                  <TableCell>{f.is_required ? <Badge>Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo Campo Customizado</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Label (exibição) *</Label>
              <Input value={form.field_label} onChange={(e) => setForm({ ...form, field_label: e.target.value })} required placeholder="Ex: Data de Aniversário" />
            </div>
            <div className="space-y-2">
              <Label>Nome do campo (slug)</Label>
              <Input value={form.field_name} onChange={(e) => setForm({ ...form, field_name: e.target.value })} placeholder="Auto-gerado se vazio" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end gap-2 pb-1">
                <Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} />
                <Label>Obrigatório</Label>
              </div>
            </div>
            {form.field_type === "picklist" && (
              <div className="space-y-2">
                <Label>Opções (uma por linha)</Label>
                <Textarea value={form.picklist_values} onChange={(e) => setForm({ ...form, picklist_values: e.target.value })} rows={4} placeholder={"Opção 1\nOpção 2\nOpção 3"} />
              </div>
            )}
            <Button type="submit" className="w-full">Criar Campo</Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
