import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye, BarChart3, CalendarClock, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ReportTemplateSelector } from "@/components/reports/ReportTemplateSelector";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ReportExportBar } from "@/components/reports/ReportExportBar";
import { ReportScheduleDialog } from "@/components/reports/ReportScheduleDialog";
import { REPORT_TEMPLATES, type ReportTemplate, type ChartType } from "@/components/reports/reportTemplates";
import type { SavedReport } from "@/components/reports/ReportBuilder";

export default function Reports() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [tab, setTab] = useState("templates");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setSavedReports(data || []);
    setLoadingSaved(false);
  }, [user]);

  useEffect(() => {
    if (tab === "saved") fetchSaved();
  }, [tab, fetchSaved]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Relatório excluído");
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
    if (viewingReport?.id === id) setViewingReport(null);
  };

  if (selectedTemplate) {
    return <ReportBuilder template={selectedTemplate} existingReport={editingReport} onBack={() => { setSelectedTemplate(null); setEditingReport(null); fetchSaved(); }} />;
  }

  if (viewingReport) {
    const tpl = REPORT_TEMPLATES.find((t) => t.id === viewingReport.template_id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewingReport(null)}>← Voltar</Button>
          <h2 className="text-lg font-semibold">{viewingReport.name}</h2>
        </div>
        <ReportViewer
          data={viewingReport.data}
          chartType={(viewingReport.chart_type || "bar") as ChartType}
          title={viewingReport.name}
        />
        <ReportExportBar data={viewingReport.data} title={viewingReport.name} />
        <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
          <CalendarClock className="h-4 w-4 mr-1" /> Agendar
        </Button>
        <ReportScheduleDialog
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          reportId={viewingReport.id}
          reportTitle={viewingReport.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Gere e visualize relatórios do seu negócio</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="saved">Meus Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <ReportTemplateSelector onSelect={setSelectedTemplate} />
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          {loadingSaved ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : savedReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum relatório salvo</p>
              <p className="text-sm mt-1">Gere um relatório a partir dos templates e salve-o</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedReports.map((report) => {
                const tpl = REPORT_TEMPLATES.find((t) => t.id === report.template_id);
                return (
                  <Card key={report.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm">{report.name}</h3>
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">{report.chart_type}</Badge>
                      </div>
                      {tpl && <p className="text-xs text-muted-foreground mb-3">{tpl.description}</p>}
                      <p className="text-xs text-muted-foreground mb-3">
                        {new Date(report.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewingReport(report)}>
                          <Eye className="h-3 w-3 mr-1" /> Ver
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          const tplObj = REPORT_TEMPLATES.find((t) => t.id === report.template_id);
                          if (tplObj) {
                            setEditingReport({
                              id: report.id,
                              name: report.name,
                              template_id: report.template_id,
                              config: report.config,
                              data: report.data,
                              chart_type: report.chart_type,
                            });
                            setSelectedTemplate(tplObj);
                          } else {
                            toast.error("Template não encontrado");
                          }
                        }}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(report.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
