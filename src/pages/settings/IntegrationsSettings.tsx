import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Settings, Trash2 } from "lucide-react";
import IntegrationCatalog from "@/components/integrations/IntegrationCatalog";
import IntegrationSetup from "@/components/integrations/IntegrationSetup";
import IntegrationDetail from "@/components/integrations/IntegrationDetail";
import IntegrationLogs from "@/components/integrations/IntegrationLogs";
import { ConnectorDefinition, CONNECTORS } from "@/components/integrations/connectorsCatalog";

export default function IntegrationsSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [setupConnector, setSetupConnector] = useState<ConnectorDefinition | null>(null);
  const [detailIntegration, setDetailIntegration] = useState<any>(null);

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
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const connectedSlugs = (integrations || [])
    .filter((i: any) => i.is_active)
    .map((i: any) => i.slug)
    .filter(Boolean);

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from("integrations").update({ is_active: active } as any).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("integrations").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast({ title: "Integração removida" });
    },
  });

  const handleManage = (connector: ConnectorDefinition) => {
    const found = integrations?.find((i: any) => i.slug === connector.slug);
    if (found) setDetailIntegration(found);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="my-integrations">
            Minhas Integrações
            {integrations?.length ? <Badge variant="secondary" className="ml-2 text-[10px]">{integrations.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <IntegrationCatalog
            connectedSlugs={connectedSlugs}
            onConnect={(c) => setSetupConnector(c)}
            onManage={handleManage}
          />
        </TabsContent>

        <TabsContent value="my-integrations" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Integrações Configuradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations?.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name || i.platform}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{i.type || "native"}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{i.category || "—"}</Badge></TableCell>
                      <TableCell><Badge variant={i.is_active ? "default" : "secondary"}>{i.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                      <TableCell><Switch checked={i.is_active} onCheckedChange={(v) => toggle.mutate({ id: i.id, active: v })} /></TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailIntegration(i)}><Settings className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!integrations?.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma integração configurada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Logs de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <IntegrationLogs tenantId={tenantId ?? null} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <IntegrationSetup
        connector={setupConnector}
        tenantId={tenantId ?? null}
        open={!!setupConnector}
        onOpenChange={(open) => !open && setSetupConnector(null)}
      />

      <IntegrationDetail
        integration={detailIntegration}
        open={!!detailIntegration}
        onOpenChange={(open) => !open && setDetailIntegration(null)}
      />
    </div>
  );
}
