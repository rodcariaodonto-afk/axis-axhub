import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RepasseCreateForm } from "@/components/repasses/RepasseCreateForm";
import { RepasseHistoryTable } from "@/components/repasses/RepasseHistoryTable";

export default function Repasses() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Repasses PJ</h1>
            <p className="text-muted-foreground">Gerencie pagamentos a Pessoas Jurídicas parceiras</p>
          </div>
        </div>

        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Repasse
        </Button>
      </div>

      <RepasseHistoryTable />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Repasse</DialogTitle>
          </DialogHeader>
          <RepasseCreateForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
