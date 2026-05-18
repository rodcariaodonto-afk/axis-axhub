import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertCircle } from "lucide-react";

export default function AdminBilling() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-xs text-muted-foreground">Gestao de assinaturas e cobranca</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Modulo aguardando definicao
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>O modulo de Billing depende da definicao do modelo de cobranca da plataforma AXHUB.</p>
          <p>Decisoes pendentes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gateway de pagamento (Stripe, Asaas, Pagar.me, etc)</li>
            <li>Modelo de cobranca (per-seat, flat fee, hibrido)</li>
            <li>Ciclos (mensal, anual, custom)</li>
            <li>Politica de inadimplencia (grace period, suspensao automatica)</li>
            <li>Plano gratuito (limites, restricoes)</li>
          </ul>
          <p className="pt-2 border-t border-border mt-3">
            <DollarSign className="h-4 w-4 inline mr-1 text-primary" />
            Apos definicao, sera criada a tabela <code className="text-xs bg-muted px-1 py-0.5 rounded">subscriptions</code> e este painel exibira MRR, ARR, churn, inadimplencia e historico por tenant.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
