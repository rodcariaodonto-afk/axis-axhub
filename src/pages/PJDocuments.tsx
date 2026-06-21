import { useState } from "react";
import { FolderKanban } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentTypeConfig } from "@/components/pj-documents/DocumentTypeConfig";
import { PJDocumentManager } from "@/components/pj-documents/PJDocumentManager";
import { DocumentComplianceDashboard } from "@/components/pj-documents/DocumentComplianceDashboard";
import { DocumentExpiryAlerts } from "@/components/pj-documents/DocumentExpiryAlerts";

export default function PJDocuments() {
  const [activeTab, setActiveTab] = useState("documentos");
  const [preFilterPJ, setPreFilterPJ] = useState<string | undefined>(undefined);

  function handleSelectPJ(pjId: string) {
    setPreFilterPJ(pjId);
    setActiveTab("documentos");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <FolderKanban className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Documental</h1>
          <p className="text-muted-foreground">Tipos de documento, arquivos dos PJs e conformidade</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documentos">Documentos por PJ</TabsTrigger>
          <TabsTrigger value="conformidade">Conformidade</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Documento</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="mt-4">
          <PJDocumentManager initialPjId={preFilterPJ} />
        </TabsContent>

        <TabsContent value="conformidade" className="mt-4">
          <div className="space-y-6">
            <DocumentComplianceDashboard onSelectPJ={handleSelectPJ} />
            <DocumentExpiryAlerts />
          </div>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <DocumentTypeConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
