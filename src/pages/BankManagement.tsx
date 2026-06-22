import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CheckCircle2, LayoutDashboard } from "lucide-react";
import { PJBankDataForm } from "@/components/bank-management/PJBankDataForm";
import { ConciliationDashboard } from "@/components/bank-management/ConciliationDashboard";
import { BankDashboard } from "@/components/bank-management/BankDashboard";

export default function BankManagement() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão Bancária</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados bancários dos PJs, conciliação de repasses e visão financeira consolidada.
        </p>
      </div>

      <Tabs defaultValue="dados-bancarios" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="dados-bancarios" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Dados Bancários
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Conciliação
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados-bancarios">
          <PJBankDataForm />
        </TabsContent>

        <TabsContent value="conciliacao">
          <ConciliationDashboard />
        </TabsContent>

        <TabsContent value="dashboard">
          <BankDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
