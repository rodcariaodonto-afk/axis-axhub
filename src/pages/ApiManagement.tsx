import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, FileText, Webhook, BookOpen } from "lucide-react";
import { ApiKeyManager } from "@/components/api-management/ApiKeyManager";
import { ApiRequestLogs } from "@/components/api-management/ApiRequestLogs";
import { WebhookConfig } from "@/components/api-management/WebhookConfig";
import { WebhookDeliveryLogs } from "@/components/api-management/WebhookDeliveryLogs";
import { ApiDocsPage } from "@/components/api-management/ApiDocsPage";

export default function ApiManagement() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de API</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie chaves de acesso, webhooks, rate limiting e monitore o uso da API REST.
        </p>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="keys" className="gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" />
            Chaves de API
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Logs de Acesso
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5 text-xs">
            <Webhook className="h-3.5 w-3.5" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="webhook-logs" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Entregas
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Documentação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <ApiKeyManager />
        </TabsContent>

        <TabsContent value="logs">
          <ApiRequestLogs />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookConfig />
        </TabsContent>

        <TabsContent value="webhook-logs">
          <WebhookDeliveryLogs />
        </TabsContent>

        <TabsContent value="docs">
          <ApiDocsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
