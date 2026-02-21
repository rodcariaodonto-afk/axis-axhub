import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ProductCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["product-categories", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("product_categories").select("*").eq("tenant_id", tenantId!).order("name");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Missing");
      if (editId) {
        const { error } = await supabase.from("product_categories").update({ name }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_categories").insert({ tenant_id: tenantId, name });
        if (error) throw error;
      }
      await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "product_categories", action: editId ? "update" : "create", after_json: { name } as any });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      setOpen(false);
      setEditId(null);
      setName("");
      toast({ title: "Categoria salva" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
      if (tenantId) await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "product_categories", entity_id: id, action: "delete" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast({ title: "Categoria removida" });
    },
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categorias de Produtos</CardTitle>
        <Button size="sm" onClick={() => { setEditId(null); setName(""); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Nova Categoria</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditId(c.id); setName(c.name); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!categories?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma categoria</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
