import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Copy, Trash2, Plus } from "lucide-react";

export default function ApiKeysManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: keys } = useQuery({
    queryKey: ["api-keys", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("api_keys").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!tenantId || !user) throw new Error("Missing");
      const key = crypto.randomUUID();
      const { error } = await supabase.from("api_keys").insert({ tenant_id: tenantId, user_id: user.id, name: newName, api_key: key });
      if (error) throw error;
      await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user.id, entity: "api_keys", action: "create", after_json: { name: newName } as any });
      return key;
    },
    onSuccess: (key) => {
      setGeneratedKey(key);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: () => toast({ title: "Erro ao gerar chave", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      if (tenantId) await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "api_keys", entity_id: id, action: "delete" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "Chave removida" });
    },
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Chaves de API</CardTitle>
        <Button size="sm" onClick={() => { setShowCreate(true); setGeneratedKey(null); }}><Plus className="h-4 w-4 mr-1" />Nova Chave</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys?.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{k.api_key.slice(0, 8)}...{k.api_key.slice(-4)}</TableCell>
                <TableCell>{new Date(k.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!keys?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma chave cadastrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{generatedKey ? "Chave Gerada" : "Nova Chave de API"}</DialogTitle></DialogHeader>
          {generatedKey ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Copie a chave abaixo. Ela não será exibida novamente.</p>
              <div className="flex gap-2">
                <Input value={generatedKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(generatedKey); toast({ title: "Copiada!" }); }}><Copy className="h-4 w-4" /></Button>
              </div>
              <DialogFooter><Button onClick={() => setShowCreate(false)}>Fechar</Button></DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome da Chave</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Integração N8N" />
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={!newName.trim() || create.isPending}>{create.isPending ? "Gerando..." : "Gerar Chave"}</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
