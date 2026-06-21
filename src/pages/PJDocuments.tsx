import { FolderKanban } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentTypeConfig } from "@/components/pj-documents/DocumentTypeConfig";
import { PJDocumentManager } from "@/components/pj-documents/PJDocumentManager";

export default function PJDocuments() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <FolderKanban className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Documental</h1>
          <p className="text-muted-foreground">Tipos de documento e arquivos dos PJs</p>
        </div>
      </div>

      <Tabs defaultValue="documentos">
        <TabsList>
          <TabsTrigger value="documentos">Documentos por PJ</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Documento</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="mt-4">
          <PJDocumentManager />
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <DocumentTypeConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
