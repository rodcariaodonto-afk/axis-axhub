import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Check, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import IntegrationLogs from "./IntegrationLogs";

interface IntegrationDetailProps {
  integration: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IntegrationDetail({ integration, open, onOpenChange }: IntegrationDetailProps) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: webhooks } = useQuery({
    queryKey: ["integration-webhooks", integration?.id],
    enabled: !!integration?.id,
    queryFn: async () => {
      const { data } = await supabase.from("integration_webhooks").select("*").eq("integration_id", integration.id);
      return data || [];
    },
  });

  const { data: mappings } = useQuery({
    queryKey: ["integration-mappings", integration?.id],
    enabled: !!integration?.id,
    queryFn: async () => {
      const { data } = await supabase.from("integration_mappings").select("*").eq("integration_id", integration.id);
      return data || [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      await supabase.from("integrations").update({ is_active: active } as any).eq("id", integration.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const deleteIntegration = useMutation({
    mutationFn: async () => {
      await supabase.from("integrations").delete().eq("id", integration.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      onOpenChange(false);
      toast({ title: "Integração removida" });
    },
  });

  if (!integration) return null;

  const webhookReceiverUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-receiver?integration_id=${integration.id}`;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {integration.name || integration.platform}
            <Badge variant={integration.is_active ? "default" : "secondary"}>
              {integration.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="config" className="flex-1">Configuração</TabsTrigger>
            <TabsTrigger value="webhooks" className="flex-1">Webhooks</TabsTrigger>
            <TabsTrigger value="mappings" className="flex-1">Mapeamento</TabsTrigger>
            <TabsTrigger value="logs" className="flex-1">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={integration.is_active} onCheckedChange={(v) => toggleActive.mutate(v)} />
            </div>
            {integration.api_key && (
              <div className="space-y-1.5">
                <Label>API Key</Label>
                <Input value="••••••••" readOnly />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>URL do Webhook Receiver</Label>
              <div className="flex gap-2">
                <Input value={webhookReceiverUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => handleCopyUrl(webhookReceiverUrl)}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => deleteIntegration.mutate()}>
              <Trash2 className="h-4 w-4 mr-1" />Remover Integração
            </Button>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks?.map((wh: any) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">{wh.webhook_url}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{wh.events?.map((e: string) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}</div></TableCell>
                    <TableCell><Badge variant={wh.is_active ? "default" : "secondary"}>{wh.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                  </TableRow>
                ))}
                {!webhooks?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum webhook</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="mappings" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo AXHUB</TableHead>
                  <TableHead>Campo Externo</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings?.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.axhub_field}</TableCell>
                    <TableCell className="font-mono text-xs">{m.external_field}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{m.transform_type}</Badge></TableCell>
                  </TableRow>
                ))}
                {!mappings?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum mapeamento</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <IntegrationLogs tenantId={integration.tenant_id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
