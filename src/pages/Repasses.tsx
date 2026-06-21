import { useState } from "react";
import { Plus, Wallet, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RepasseCreateForm } from "@/components/repasses/RepasseCreateForm";
import { RepasseHistoryTable } from "@/components/repasses/RepasseHistoryTable";
import { RepasseScheduleForm } from "@/components/repasses/RepasseScheduleForm";
import { RepasseScheduleList } from "@/components/repasses/RepasseScheduleList";

export default function Repasses() {
  const [manualOpen, setManualOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repasses PJ</h1>
          <p className="text-muted-foreground">Gerencie pagamentos a Pessoas Jurídicas parceiras</p>
        </div>
      </div>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="automaticos">Automáticos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ── Manual ── */}
        <TabsContent value="manual" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Repasse
            </Button>
          </div>
          <RepasseHistoryTable />
        </TabsContent>

        {/* ── Automáticos ── */}
        <TabsContent value="automaticos" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => setScheduleOpen(true)}>
              <CalendarClock className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
          <RepasseScheduleList />
        </TabsContent>

        {/* ── Histórico ── */}
        <TabsContent value="historico" className="mt-6">
          <RepasseHistoryTable />
        </TabsContent>
      </Tabs>

      {/* Manual repasse dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Repasse</DialogTitle>
          </DialogHeader>
          <RepasseCreateForm onSuccess={() => setManualOpen(false)} onCancel={() => setManualOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Schedule creation dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <RepasseScheduleForm
            onSuccess={() => setScheduleOpen(false)}
            onCancel={() => setScheduleOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
