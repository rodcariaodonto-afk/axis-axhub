import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BIDashboard } from "@/components/bi/BIDashboard";
import PageLoader from "@/components/PageLoader";

/**
 * Página de Business Intelligence
 *
 * Aba "Geral": dashboards configuráveis com widgets (sistema existente)
 * Aba "DRE": Demonstração do Resultado do Exercício (Slice 3)
 * Aba "Balanço": Balanço Patrimonial (Slice 4)
 *
 * As páginas DRE e BalancoPatrimonial já estão acessíveis via /dre e /balanco-patrimonial.
 * Aqui são reaproveitadas para concentrar a análise financeira no BI.
 */

const DRE = lazy(() => import("./DRE"));
const BalancoPatrimonial = lazy(() => import("./BalancoPatrimonial"));

export default function BusinessIntelligence() {
  return (
    <div className="p-6">
      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="balanco">Balanço Patrimonial</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <BIDashboard />
        </TabsContent>

        <TabsContent value="dre">
          <Suspense fallback={<PageLoader />}>
            <DRE />
          </Suspense>
        </TabsContent>

        <TabsContent value="balanco">
          <Suspense fallback={<PageLoader />}>
            <BalancoPatrimonial />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
