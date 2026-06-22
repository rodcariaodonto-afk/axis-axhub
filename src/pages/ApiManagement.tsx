import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, FileText } from "lucide-react";
import { ApiKeyManager } from "@/components/api-management/ApiKeyManager";
import { ApiRequestLogs } from "@/components/api-management/ApiRequestLogs";

export default function ApiManagement() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de API</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie chaves de acesso, escopos, rate limiting e monitore o uso da API REST.
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
        </TabsList>

        <TabsContent value="keys">
          <ApiKeyManager />
        </TabsContent>

        <TabsContent value="logs">
          <ApiRequestLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
