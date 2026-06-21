import { useState } from "react";
import { Plus, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NFApprovalList } from "@/components/nf-approval/NFApprovalList";
import { NFUploadForm } from "@/components/nf-approval/NFUploadForm";
import { NFWorkflowConfig } from "@/components/nf-approval/NFWorkflowConfig";

export default function NFApprovals() {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais PJ</h1>
            <p className="text-muted-foreground">Recebimento e aprovação de NFs de Pessoas Jurídicas</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          Enviar NF
        </Button>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          <NFApprovalList />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <NFWorkflowConfig />
        </TabsContent>
      </Tabs>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Nota Fiscal</DialogTitle>
          </DialogHeader>
          <NFUploadForm mode="admin" onSuccess={() => setUploadOpen(false)} onCancel={() => setUploadOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
