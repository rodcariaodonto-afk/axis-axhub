import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, Check, Webhook } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const PLATFORMS = ["Shopify", "MercadoLivre", "N8N", "WhatsApp API", "Gmail API"];

interface IntForm { platform: string; api_key: string; api_secret: string; webhook_url: string; }
const emptyForm: IntForm = { platform: "", api_key: "", api_secret: "", webhook_url: "" };

export default function IntegrationsSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<IntForm>(emptyForm);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: integrations } = useQuery({
    queryKey: ["integrations", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("integrations").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Missing");
      const { error } = await supabase.from("integrations").insert({
        tenant_id: tenantId,
        platform: form.platform,
        api_key: form.api_key || null,
        api_secret: form.api_secret || null,
        webhook_url: form.webhook_url || null,
        is_active: true,
      });
      if (error) throw error;
      await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "integrations", action: "create", after_json: { platform: form.platform } as any });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Integração adicionada" });
    },
    onError: () => toast({ title: "Erro ao adicionar", variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("integrations").update({ is_active: active }).eq("id", id);
      if (error) throw error;
      if (tenantId) await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "integrations", entity_id: id, action: active ? "activate" : "deactivate" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integrations").delete().eq("id", id);
      if (error) throw error;
      if (tenantId) await supabase.from("audit_logs").insert({ tenant_id: tenantId, actor_user_id: user?.id, entity: "integrations", entity_id: id, action: "delete" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast({ title: "Integração removida" });
    },
  });

  return (
    <div className="space-y-6">
      {/* WhatsApp Webhook Info */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhook WhatsApp (N8N)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">URL do Webhook</Label>
            <div className="flex items-center gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Como configurar no N8N:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Trigger:</strong> Adicione o nó de webhook do WhatsApp para receber mensagens.</li>
              <li>
                <strong>HTTP Request:</strong> Faça um POST para a URL acima com:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Header: <code className="bg-muted px-1 rounded">x-n8n-signature: &lt;sua_chave_secreta&gt;</code></li>
                  <li>Body JSON: <code className="bg-muted px-1 rounded">{"{ phone, message, tenant_id }"}</code></li>
                </ul>
              </li>
              <li><strong>WhatsApp node:</strong> Envie a resposta formatada de volta ao usuário.</li>
            </ol>
            <p className="mt-2">A busca é feita por <strong>nome</strong> e <strong>SKU</strong> do produto. Retorna até 5 resultados.</p>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Table */}
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Integrações</CardTitle>
        <Button size="sm" onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Nova Integração</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plataforma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations?.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.platform}</TableCell>
                <TableCell><Badge variant={i.is_active ? "default" : "secondary"}>{i.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell><Switch checked={i.is_active} onCheckedChange={(v) => toggle.mutate({ id: i.id, active: v })} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            {!integrations?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma integração</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

    </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Integração</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>API Secret</Label>
              <Input type="password" value={form.api_secret} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Webhook URL</Label>
              <Input value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.platform || create.isPending}>{create.isPending ? "Salvando..." : "Adicionar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
