import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

/**
 * Stub inicial da pagina de Tenants do Super Admin.
 * Fase 2: apenas valida que a rota e o guard funcionam.
 * Fase 3 adicionara: listagem real via v_global_tenant_metrics,
 * busca, filtros, criacao, suspender, reativar, excluir.
 */
export default function AdminTenants() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tenants</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Modulo em construcao
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Esta pagina sera o painel de gestao de todos os tenants da plataforma AXHUB.
          </p>
          <p className="mt-2">
            Funcionalidades planejadas para a proxima fase:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Listagem com busca e filtros</li>
            <li>Criacao de novo tenant (com admin inicial)</li>
            <li>Suspender, reativar e excluir tenant</li>
            <li>Drill-down em cada tenant (usuarios, atividade, assinatura)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
