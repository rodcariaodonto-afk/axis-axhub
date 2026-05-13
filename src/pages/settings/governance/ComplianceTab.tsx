import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Download, Loader2 } from "lucide-react";

export default function ComplianceTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["compliance-report"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("governance-compliance-report", { body: {} });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!data) return <div className="text-sm text-muted-foreground py-8">Sem dados</div>;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `conformidade-${new Date().toISOString()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const iconFor = (s: string) => s === "ok" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : s === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-500 border-green-500/40">{data.summary.ok} OK</Badge>
          <Badge variant="outline" className="text-amber-500 border-amber-500/40">{data.summary.warning} Avisos</Badge>
          <Badge variant="outline" className="text-destructive border-destructive/40">{data.summary.critical} Críticos</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>Atualizar</Button>
          <Button size="sm" onClick={exportJson}><Download className="h-4 w-4 mr-1.5" />Exportar JSON</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.checks.map((c: { id: string; label: string; status: string; details?: string }) => (
          <Card key={c.id} className="p-4 flex items-start gap-3">
            {iconFor(c.status)}
            <div className="flex-1">
              <p className="font-medium text-sm">{c.label}</p>
              {c.details && <p className="text-xs text-muted-foreground mt-1">{c.details}</p>}
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")}</p>
    </div>
  );
}
