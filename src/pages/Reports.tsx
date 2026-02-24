import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Eye, BarChart3, Pencil, Star, Copy, Plus, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ReportTemplateSelector } from "@/components/reports/ReportTemplateSelector";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { REPORT_TEMPLATES, type ReportTemplate } from "@/components/reports/reportTemplates";
import { REPORT_OBJECTS } from "@/components/reports/reportObjectFields";
import type { SavedReport } from "@/components/reports/ReportBuilder";

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Legacy template mode
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);

  // Reports list
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [tab, setTab] = useState("builder");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterObject, setFilterObject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFavorites, setShowFavorites] = useState(false);

  // New report modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newObjectName, setNewObjectName] = useState("");
  const [newReportType, setNewReportType] = useState("table");
  const [creating, setCreating] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    const { data } = await (supabase.from as any)("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports(data || []);
    setLoadingReports(false);
  }, [user]);

  useEffect(() => {
    if (tab === "builder" || tab === "saved") fetchReports();
  }, [tab, fetchReports]);

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("reports").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Relatório excluído");
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    const { error } = await (supabase.from as any)("reports").update({ is_favorite: !current }).eq("id", id);
    if (error) { toast.error("Erro"); return; }
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, is_favorite: !current } : r));
  };

  const handleDuplicate = async (report: any) => {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) throw new Error("Perfil não encontrado");
      const { error } = await (supabase.from as any)("reports").insert({
        tenant_id: profile.tenant_id,
        name: report.name + " (Cópia)",
        description: report.description,
        config: report.config,
        data: report.data,
        chart_type: report.chart_type,
        template_id: report.template_id,
        report_type: report.report_type || "table",
        object_name: report.object_name,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("Relatório duplicado");
      fetchReports();
    } catch {
      toast.error("Erro ao duplicar");
    }
  };

  const handleCreateNew = async () => {
    if (!user || !newName || !newObjectName) { toast.error("Preencha nome e objeto"); return; }
    setCreating(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) throw new Error("Perfil não encontrado");

      const { getDefaultConfig } = await import("@/components/reports/reportObjectFields");
      const defaultConfig = getDefaultConfig(newObjectName);

      const { data, error } = await (supabase.from as any)("reports").insert({
        tenant_id: profile.tenant_id,
        name: newName,
        description: newDescription || null,
        object_name: newObjectName,
        report_type: newReportType,
        config: defaultConfig as any,
        created_by: user.id,
      }).select().single();
      if (error) throw error;

      setNewModalOpen(false);
      setNewName("");
      setNewDescription("");
      setNewObjectName("");
      setNewReportType("table");
      navigate(`/reports/${data.id}/builder`);
    } catch {
      toast.error("Erro ao criar relatório");
    } finally {
      setCreating(false);
    }
  };

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (showFavorites && !r.is_favorite) return false;
    if (filterObject !== "all" && r.object_name !== filterObject) return false;
    if (filterType !== "all" && r.report_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.name?.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Only visual builder reports (have object_name)
  const builderReports = filteredReports.filter((r) => r.object_name);
  // Legacy template-based reports
  const legacyReports = filteredReports.filter((r) => !r.object_name && r.template_id);

  // Summary counts
  const objectCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  reports.forEach((r) => {
    if (r.object_name) objectCounts[r.object_name] = (objectCounts[r.object_name] || 0) + 1;
    if (r.report_type) typeCounts[r.report_type] = (typeCounts[r.report_type] || 0) + 1;
  });

  // Legacy template view
  if (selectedTemplate) {
    return (
      <ReportBuilder
        template={selectedTemplate}
        existingReport={editingReport}
        onBack={() => { setSelectedTemplate(null); setEditingReport(null); fetchReports(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Crie e gerencie relatórios customizados</p>
        </div>
        <Button onClick={() => setNewModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Novo Relatório
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="builder">Meus Relatórios</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-4 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar relatórios..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterObject} onValueChange={setFilterObject}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Objeto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Objetos</SelectItem>
                {REPORT_OBJECTS.map((o) => <SelectItem key={o.name} value={o.name}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="table">Tabela</SelectItem>
                <SelectItem value="chart">Gráfico</SelectItem>
                <SelectItem value="summary">Resumo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={showFavorites ? "default" : "outline"} size="sm" onClick={() => setShowFavorites(!showFavorites)}>
              <Star className={`h-4 w-4 mr-1 ${showFavorites ? "fill-current" : ""}`} />Favoritos
            </Button>
          </div>

          <div className="flex gap-6">
            {/* Main grid */}
            <div className="flex-1">
              {loadingReports ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : builderReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum relatório encontrado</p>
                  <p className="text-sm mt-1">Clique em "Novo Relatório" para criar um</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {builderReports.map((report) => {
                    const obj = REPORT_OBJECTS.find((o) => o.name === report.object_name);
                    return (
                      <Card key={report.id} className="border-border hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-sm line-clamp-1">{report.name}</h3>
                            <button
                              onClick={() => handleToggleFavorite(report.id, report.is_favorite)}
                              className="shrink-0 ml-2"
                            >
                              <Star className={`h-4 w-4 ${report.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                            </button>
                          </div>
                          {report.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{report.description}</p>}
                          <div className="flex gap-1 mb-3 flex-wrap">
                            {obj && <Badge variant="outline" className="text-xs">{obj.label}</Badge>}
                            <Badge variant="secondary" className="text-xs">{report.report_type || "table"}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
                            <p>Criado: {new Date(report.created_at).toLocaleDateString("pt-BR")}</p>
                            {report.last_run_at && <p>Última execução: {new Date(report.last_run_at).toLocaleDateString("pt-BR")}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}/view`)}>
                              <Eye className="h-3 w-3 mr-1" />Ver
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${report.id}/builder`)}>
                              <Pencil className="h-3 w-3 mr-1" />Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(report)}>
                              <Copy className="h-3 w-3" />
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

              {/* Legacy template reports */}
              {legacyReports.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Relatórios de Templates</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {legacyReports.map((report) => {
                      const tpl = REPORT_TEMPLATES.find((t) => t.id === report.template_id);
                      return (
                        <Card key={report.id} className="border-border">
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-sm mb-1">{report.name}</h3>
                            {tpl && <p className="text-xs text-muted-foreground mb-2">{tpl.description}</p>}
                            <Badge variant="outline" className="text-xs mb-3">{report.chart_type || "bar"}</Badge>
                            <div className="flex items-center gap-1 mt-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                if (tpl) {
                                  setEditingReport({
                                    id: report.id, name: report.name, template_id: report.template_id,
                                    config: report.config, data: report.data, chart_type: report.chart_type,
                                  });
                                  setSelectedTemplate(tpl);
                                }
                              }}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(report.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <div className="hidden lg:block w-56 shrink-0 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-medium">Resumo</h4>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{reports.length}</span></div>
                  </div>
                  {Object.keys(objectCounts).length > 0 && (
                    <>
                      <h5 className="text-xs font-medium text-muted-foreground mt-3">Por Objeto</h5>
                      <div className="text-xs space-y-1">
                        {Object.entries(objectCounts).map(([key, count]) => {
                          const obj = REPORT_OBJECTS.find((o) => o.name === key);
                          return <div key={key} className="flex justify-between"><span className="text-muted-foreground">{obj?.label || key}</span><span>{count}</span></div>;
                        })}
                      </div>
                    </>
                  )}
                  {Object.keys(typeCounts).length > 0 && (
                    <>
                      <h5 className="text-xs font-medium text-muted-foreground mt-3">Por Tipo</h5>
                      <div className="text-xs space-y-1">
                        {Object.entries(typeCounts).map(([key, count]) => (
                          <div key={key} className="flex justify-between"><span className="text-muted-foreground capitalize">{key}</span><span>{count}</span></div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <ReportTemplateSelector onSelect={setSelectedTemplate} />
        </TabsContent>
      </Tabs>

      {/* New Report Modal */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do relatório" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Descrição opcional" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Objeto *</Label>
              <Select value={newObjectName} onValueChange={setNewObjectName}>
                <SelectTrigger><SelectValue placeholder="Selecione o objeto" /></SelectTrigger>
                <SelectContent>
                  {REPORT_OBJECTS.map((o) => <SelectItem key={o.name} value={o.name}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Relatório *</Label>
              <Select value={newReportType} onValueChange={setNewReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Tabela</SelectItem>
                  <SelectItem value="chart">Gráfico</SelectItem>
                  <SelectItem value="summary">Resumo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateNew} disabled={creating || !newName || !newObjectName}>
              {creating ? "Criando..." : "Criar e Configurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
