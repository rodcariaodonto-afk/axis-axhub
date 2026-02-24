import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, Play, Download, CalendarClock } from "lucide-react";
import { OBJECT_MAP, type VisualReportConfig } from "@/components/reports/reportObjectFields";
import { executeReport, type ReportResult } from "@/components/reports/reportEngine";
import { ReportExportBar } from "@/components/reports/ReportExportBar";
import { ReportScheduleDialog } from "@/components/reports/ReportScheduleDialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import PageLoader from "@/components/PageLoader";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [page, setPage] = useState(1);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await (supabase.from as any)("reports").select("*").eq("id", id).single();
      if (error || !data) { toast.error("Relatório não encontrado"); navigate("/reports"); return; }
      setReport(data);
      setLoading(false);
    })();
  }, [id, navigate]);

  const handleExecute = useCallback(async (p = 1) => {
    if (!report) return;
    setExecuting(true);
    try {
      const config = report.config as VisualReportConfig;
      if (!config?.selectedFields) { toast.error("Configuração inválida"); setExecuting(false); return; }
      const r = await executeReport(report.object_name || "accounts", config, p);
      setResult(r);
      setPage(p);
      // Update last_run_at
      await (supabase.from as any)("reports").update({ last_run_at: new Date().toISOString() }).eq("id", report.id);
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "Desconhecido"));
    } finally {
      setExecuting(false);
    }
  }, [report]);

  useEffect(() => {
    if (report && report.config?.selectedFields) {
      handleExecute(1);
    }
  }, [report]);

  if (loading) return <PageLoader />;
  if (!report) return null;

  const config = report.config as VisualReportConfig;
  const obj = OBJECT_MAP[report.object_name || ""];
  const fields = obj?.fields || [];
  const totalPages = result ? Math.ceil(result.totalCount / 15) : 0;

  // Build export data from result
  const exportData = result ? {
    labels: config?.selectedFields || [],
    datasets: [{ label: report.name, data: result.rows.map(() => 0) }],
    summary: result.summaryValues.map((sv) => ({ label: sv.label, value: String(sv.value) })),
    tableData: result.rows,
  } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{report.name}</h2>
          {report.description && <p className="text-sm text-muted-foreground">{report.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {obj && <Badge variant="outline">{obj.label}</Badge>}
          <Badge variant="secondary">{report.report_type || "table"}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => navigate(`/reports/${report.id}/builder`)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
        <Button variant="outline" size="sm" onClick={() => handleExecute(1)} disabled={executing}>
          <Play className="h-4 w-4 mr-1" />{executing ? "Executando..." : "Executar Novamente"}
        </Button>
        {exportData && <ReportExportBar data={exportData} title={report.name} />}
        <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}><CalendarClock className="h-4 w-4 mr-1" />Agendar</Button>
      </div>

      {report.last_run_at && (
        <p className="text-xs text-muted-foreground">
          Última execução: {new Date(report.last_run_at).toLocaleString("pt-BR")} • {result?.totalCount || 0} registros
        </p>
      )}

      {/* Summary cards */}
      {result && config?.summaryEnabled && result.summaryValues.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {result.summaryValues.map((sv, idx) => (
            <Card key={idx} className="min-w-[140px]">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{sv.label}</p>
                <p className="text-lg font-bold">{sv.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {executing && (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {result && !executing && config?.visualization === "table" && (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {(config.selectedFields || []).map((f: string) => {
                  const fd = fields.find((x) => x.name === f);
                  return <TableHead key={f} className="text-xs">{fd?.label || f}</TableHead>;
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row, idx) => (
                <TableRow key={idx}>
                  {(config.selectedFields || []).map((f: string) => {
                    const fd = fields.find((x) => x.name === f);
                    return <TableCell key={f} className="text-xs">{formatCell(row[f], fd)}</TableCell>;
                  })}
                </TableRow>
              ))}
              {result.rows.length === 0 && (
                <TableRow><TableCell colSpan={(config.selectedFields || []).length} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-muted-foreground">{result.totalCount} registros • Página {page}/{totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handleExecute(page - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handleExecute(page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && !executing && config?.visualization === "chart" && result.groupedData.length > 0 && (
        <div className="border rounded-lg p-4 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(config.chartType || "bar", result.groupedData)}
          </ResponsiveContainer>
        </div>
      )}

      {result && !executing && config?.visualization === "summary" && result.summaryValues.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {result.summaryValues.map((sv, idx) => (
            <Card key={idx}>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">{sv.label}</p>
                <p className="text-3xl font-bold">{sv.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReportScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} reportId={report.id} reportTitle={report.name} />
    </div>
  );
}

function formatCell(value: any, field?: any): string {
  if (value === null || value === undefined) return "—";
  if (field?.type === "date" && typeof value === "string") {
    try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return String(value); }
  }
  if (field?.type === "number") return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (field?.type === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function renderChart(chartType: string, data: { label: string; value: number }[]) {
  switch (chartType) {
    case "line":
      return (<LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" name="Valor" /></LineChart>);
    case "pie":
      return (<PieChart><Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="80%" label>{data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>);
    case "area":
      return (<AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Area type="monotone" dataKey="value" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} name="Valor" /></AreaChart>);
    default:
      return (<BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="value" fill="hsl(var(--primary))" name="Valor" radius={[4, 4, 0, 0]} /></BarChart>);
  }
}
