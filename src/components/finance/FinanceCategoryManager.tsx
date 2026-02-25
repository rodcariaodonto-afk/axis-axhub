import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserTenantId } from "@/lib/getUserTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: "receita" | "despesa";
  color: string;
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
  "#EC4899", "#F43F5E", "#78716C", "#64748B", "#1E293B",
];

export default function FinanceCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"receita" | "despesa">("receita");
  const [color, setColor] = useState("#3B82F6");

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("finance_categories")
      .select("id, name, type, color")
      .order("created_at", { ascending: false });
    setCategories((data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const resetForm = () => { setName(""); setType("receita"); setColor("#3B82F6"); setEditingId(null); };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome da categoria"); return; }
    const tenant_id = await getUserTenantId();
    if (!tenant_id) { toast.error("Erro ao identificar tenant"); return; }

    if (editingId) {
      const { error } = await supabase.from("finance_categories").update({ name: name.trim(), type, color }).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Categoria atualizada");
    } else {
      const { error } = await supabase.from("finance_categories").insert({ tenant_id, name: name.trim(), type, color });
      if (error) { toast.error("Erro ao criar categoria"); return; }
      toast.success("Categoria criada");
    }
    setOpen(false);
    resetForm();
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("finance_categories").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Categoria excluída");
    fetchCategories();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categorias Financeiras</h2>
          <p className="text-sm text-muted-foreground">Gerencie as categorias de receita e despesa</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Categoria</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead>Cor</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : categories.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma categoria cadastrada</TableCell></TableRow>
          ) : categories.map((cat) => (
            <TableRow key={cat.id} className="border-border">
              <TableCell>
                <div className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: cat.color }} />
              </TableCell>
              <TableCell className="font-medium">{cat.name}</TableCell>
              <TableCell>
                <Badge variant={cat.type === "receita" ? "default" : "secondary"}>
                  {cat.type === "receita" ? "Receita" : "Despesa"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input placeholder="Ex: Alimentação, Salário..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <RadioGroup value={type} onValueChange={(v) => setType(v as "receita" | "despesa")} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="receita" id="receita" />
                  <Label htmlFor="receita">Receita</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="despesa" id="despesa" />
                  <Label htmlFor="despesa">Despesa</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Cor da Categoria</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-10 rounded border border-input cursor-pointer bg-transparent p-0.5" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-28 font-mono" maxLength={7} />
                <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: color }} />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={`h-6 w-6 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
