import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface FieldForm {
  field_name: string;
  field_type: string;
  is_required: boolean;
  options: string;
}

const emptyForm: FieldForm = { field_name: "", field_type: "text", is_required: false, options: "" };

export default function CustomFieldsSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FieldForm>(emptyForm);
  const [open, setOpen] = useState(false);

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: fields } = useQuery({
    queryKey: ["custom-fields", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("product_custom_fields").select("*").eq("tenant_id", tenantId!).order("sort_order");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Missing");
      const opts = form.options ? form.options.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const payload = { tenant_id: tenantId, field_name: form.field_name, field_type: form.field_type, is_required: form.is_required, options: opts };
      if (editId) {
        const { error } = await supabase.from("product_custom_fields").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_custom_fields").insert(payload);
        if (error) throw error;
      }
      await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "product_custom_fields", action: editId ? "update" : "create", after_json: payload as any });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast({ title: "Campo salvo" });
    },
    onError: () => toast({ title: "Erro ao salvar campo", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_custom_fields").delete().eq("id", id);
      if (error) throw error;
      if (tenantId) await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "product_custom_fields", entity_id: id, action: "delete" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Campo removido" });
    },
  });

  const openEdit = (f: any) => {
    setEditId(f.id);
    setForm({ field_name: f.field_name, field_type: f.field_type, is_required: f.is_required ?? false, options: (f.options || []).join(", ") });
    setOpen(true);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Campos Customizados de Produtos</CardTitle>
        <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Campo</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Obrigatório</TableHead>
              <TableHead>Opções</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields?.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.field_name}</TableCell>
                <TableCell>{f.field_type}</TableCell>
                <TableCell>{f.is_required ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{(f.options || []).join(", ") || "—"}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!fields?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum campo cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Campo" : "Novo Campo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do Campo</Label>
              <Input value={form.field_name} onChange={(e) => setForm({ ...form, field_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="select">Seleção</SelectItem>
                  <SelectItem value="boolean">Sim/Não</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: !!v })} id="req" />
              <Label htmlFor="req">Obrigatório</Label>
            </div>
            {form.field_type === "select" && (
              <div className="space-y-1.5">
                <Label>Opções (separadas por vírgula)</Label>
                <Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Opção 1, Opção 2" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={!form.field_name.trim() || save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
