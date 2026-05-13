import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Download, ScrollText, Clock, FileCheck, UserCheck, FileSignature, Settings2 } from "lucide-react";
import OverviewTab from "./governance/OverviewTab";
import ExportsTab from "./governance/ExportsTab";
import AuditLogsView from "./AuditLogsView";
import RetentionTab from "./governance/RetentionTab";
import ComplianceTab from "./governance/ComplianceTab";
import SubjectRequestsTab from "./governance/SubjectRequestsTab";
import ConsentsTab from "./governance/ConsentsTab";
import PoliciesTab from "./governance/PoliciesTab";

export default function DataGovernance() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Governança de Dados</h2>
          <p className="text-sm text-muted-foreground">
            Visibilidade, controle e conformidade dos dados da sua conta.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><Shield className="h-4 w-4 mr-1.5" />Visão geral</TabsTrigger>
          <TabsTrigger value="exports"><Download className="h-4 w-4 mr-1.5" />Exportações</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="h-4 w-4 mr-1.5" />Auditoria</TabsTrigger>
          <TabsTrigger value="retention"><Clock className="h-4 w-4 mr-1.5" />Retenção & Exclusão</TabsTrigger>
          <TabsTrigger value="compliance"><FileCheck className="h-4 w-4 mr-1.5" />Conformidade</TabsTrigger>
          <TabsTrigger value="dsr"><UserCheck className="h-4 w-4 mr-1.5" />Pedidos dos titulares</TabsTrigger>
          <TabsTrigger value="consents"><FileSignature className="h-4 w-4 mr-1.5" />Consentimentos</TabsTrigger>
          <TabsTrigger value="policies"><Settings2 className="h-4 w-4 mr-1.5" />Políticas</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab onNavigate={setTab} /></TabsContent>
        <TabsContent value="exports"><ExportsTab /></TabsContent>
        <TabsContent value="audit"><AuditLogsView /></TabsContent>
        <TabsContent value="retention"><RetentionTab /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab /></TabsContent>
        <TabsContent value="dsr"><SubjectRequestsTab /></TabsContent>
        <TabsContent value="consents"><ConsentsTab /></TabsContent>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
