import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface WHForm { name: string; is_default: boolean; }

export default function WarehousesSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<WHForm>({ name: "", is_default: false });

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("warehouses").select("*").eq("tenant_id", tenantId!).order("name");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Missing");
      if (editId) {
        const { error } = await supabase.from("warehouses").update({ name: form.name, is_default: form.is_default }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert({ tenant_id: tenantId, name: form.name, is_default: form.is_default });
        if (error) throw error;
      }
      await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "warehouses", action: editId ? "update" : "create", after_json: form as any });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses-settings"] });
      setOpen(false);
      setEditId(null);
      setForm({ name: "", is_default: false });
      toast({ title: "Depósito salvo" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (w: any) => {
      if (w.is_default) throw new Error("Não é possível excluir o depósito padrão");
      const { error } = await supabase.from("warehouses").delete().eq("id", w.id);
      if (error) throw error;
      if (tenantId) await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "warehouses", entity_id: w.id, action: "delete" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses-settings"] });
      toast({ title: "Depósito removido" });
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao remover", variant: "destructive" }),
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Depósitos</CardTitle>
        <Button size="sm" onClick={() => { setEditId(null); setForm({ name: "", is_default: false }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Depósito</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses?.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell>{w.is_default ? <Badge>Padrão</Badge> : "—"}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditId(w.id); setForm({ name: w.name, is_default: w.is_default }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  {!w.is_default && <Button variant="ghost" size="icon" onClick={() => remove.mutate(w)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Depósito" : "Novo Depósito"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: !!v })} id="def" />
              <Label htmlFor="def">Depósito padrão</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
