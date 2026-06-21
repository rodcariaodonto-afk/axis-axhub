import { Clock } from "lucide-react";
import { ContractVigencyDashboard } from "@/components/contract-vigency/ContractVigencyDashboard";
import { VigencyAlerts } from "@/components/contract-vigency/VigencyAlerts";

export default function ContractVigency() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vigência de Contratos</h1>
          <p className="text-muted-foreground">Monitore vencimentos e gerencie renovações</p>
        </div>
      </div>

      <VigencyAlerts maxItems={3} />

      <ContractVigencyDashboard />
    </div>
  );
}
