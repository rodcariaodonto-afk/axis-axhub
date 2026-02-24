import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Save } from "lucide-react";
import { type ReportTemplate, type ChartType } from "./reportTemplates";
import { type ReportConfig, type ReportData, generateReportData } from "./reportDataGenerators";
import { ReportViewer } from "./ReportViewer";
import { ReportExportBar } from "./ReportExportBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SavedReport {
  id: string;
  name: string;
  template_id: string;
  config: ReportConfig;
  data: ReportData;
  chart_type: ChartType;
}

interface Props {
  template: ReportTemplate;
  onBack: () => void;
  existingReport?: SavedReport | null;
}

export function ReportBuilder({ template, onBack, existingReport }: Props) {
  const { user } = useAuth();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [config, setConfig] = useState<ReportConfig>(
    existingReport?.config || {
      dateRange: {
        start: sixMonthsAgo.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0],
      },
      group_by: template.defaultConfig.group_by || template.availableGroupBy[0]?.value || "month",
      filters: template.defaultConfig.filters,
    }
  );
  const [chartType, setChartType] = useState<ChartType>(existingReport?.chart_type || template.defaultChartType);
  const [reportData, setReportData] = useState<ReportData | null>(existingReport?.data || null);
  const [loading, setLoading] = useState(false);
  const [reportName, setReportName] = useState(existingReport?.name || template.name);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateReportData(template.id, config);
      setReportData(data);
    } catch (err) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !reportData) return;
    setSaving(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) throw new Error("Perfil não encontrado");

      if (existingReport) {
        const { error } = await supabase.from("reports").update({
          name: reportName,
          config: config as any,
          data: reportData as any,
          chart_type: chartType,
        }).eq("id", existingReport.id);
        if (error) throw error;
        toast.success("Relatório atualizado com sucesso");
      } else {
        const { error } = await supabase.from("reports").insert({
          tenant_id: profile.tenant_id,
          name: reportName,
          template_id: template.id,
          config: config as any,
          data: reportData as any,
          chart_type: chartType,
          created_by: user.id,
        });
        if (error) throw error;
        toast.success("Relatório salvo com sucesso");
      }
    } catch {
      toast.error("Erro ao salvar relatório");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configurações</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={config.dateRange.start} onChange={(e) => setConfig((c) => ({ ...c, dateRange: { ...c.dateRange, start: e.target.value } }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={config.dateRange.end} onChange={(e) => setConfig((c) => ({ ...c, dateRange: { ...c.dateRange, end: e.target.value } }))} />
            </div>
            {template.availableGroupBy.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Agrupar por</Label>
                <Select value={config.group_by} onValueChange={(v) => setConfig((c) => ({ ...c, group_by: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {template.availableGroupBy.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Gráfico</Label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="line">Linhas</SelectItem>
                  <SelectItem value="pie">Pizza</SelectItem>
                  <SelectItem value="table">Tabela</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerate} disabled={loading}>
              <Play className="h-4 w-4 mr-1" />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          <ReportViewer data={reportData} chartType={chartType} title={template.name} />
          <div className="flex items-center gap-3">
            <Input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Nome do relatório" className="max-w-xs" />
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar"}
            </Button>
            <ReportExportBar data={reportData} title={reportName} />
          </div>
        </>
      )}
    </div>
  );
}
