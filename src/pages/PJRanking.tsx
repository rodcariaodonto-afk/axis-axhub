import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Star, Settings2, TrendingUp, Plus } from "lucide-react";
import { PJRankingDashboard } from "@/components/pj-evaluation/PJRankingDashboard";
import { ScoreEvolutionChart } from "@/components/pj-evaluation/ScoreEvolutionChart";
import { EvaluationHistory } from "@/components/pj-evaluation/EvaluationHistory";
import { EvaluationForm } from "@/components/pj-evaluation/EvaluationForm";
import { EvaluationCriteriaConfig } from "@/components/pj-evaluation/EvaluationCriteriaConfig";

export default function PJRanking() {
  const [evalFormOpen, setEvalFormOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ranking de PJs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Score composto, avaliações e evolução dos Profissionais Jurídicos.
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setEvalFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Avaliação
        </Button>
      </div>

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="ranking" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            Evolução
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5 text-xs">
            <Star className="h-3.5 w-3.5" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="criterios" className="gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
            Critérios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
          <PJRankingDashboard />
        </TabsContent>

        <TabsContent value="evolucao">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Evolução do Score ao Longo do Tempo</h3>
            <ScoreEvolutionChart />
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <EvaluationHistory />
        </TabsContent>

        <TabsContent value="criterios">
          <EvaluationCriteriaConfig />
        </TabsContent>
      </Tabs>

      <EvaluationForm open={evalFormOpen} onClose={() => setEvalFormOpen(false)} />
    </div>
  );
}
