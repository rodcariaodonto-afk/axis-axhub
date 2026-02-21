import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectorDefinition, CATEGORY_LABELS } from "./connectorsCatalog";
import { Plug, Settings } from "lucide-react";

interface IntegrationCardProps {
  connector: ConnectorDefinition;
  isConnected?: boolean;
  onConnect: (connector: ConnectorDefinition) => void;
  onManage?: (connector: ConnectorDefinition) => void;
}

export default function IntegrationCard({ connector, isConnected, onConnect, onManage }: IntegrationCardProps) {
  return (
    <Card className="border-border bg-card hover:border-primary/30 transition-colors">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{connector.icon}</span>
            <div>
              <h3 className="font-semibold text-sm text-foreground">{connector.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{connector.description}</p>
            </div>
          </div>
          {isConnected && <Badge variant="default" className="text-[10px] shrink-0">Conectado</Badge>}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[connector.category]}</Badge>
            <Badge variant="outline" className="text-[10px]">{connector.authType}</Badge>
          </div>
          {isConnected ? (
            <Button size="sm" variant="outline" onClick={() => onManage?.(connector)}>
              <Settings className="h-3.5 w-3.5 mr-1" />Gerenciar
            </Button>
          ) : (
            <Button size="sm" onClick={() => onConnect(connector)}>
              <Plug className="h-3.5 w-3.5 mr-1" />Conectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
