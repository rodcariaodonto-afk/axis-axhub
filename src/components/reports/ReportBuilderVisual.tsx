import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ChevronDown, ChevronRight, Play, Plus, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import {
  OBJECT_MAP,
  FILTER_OPERATORS,
  SUMMARY_FUNCTIONS,
  type VisualReportConfig,
  type ReportFilter,
  type ReportSort,
  type ReportSummaryField,
  type ObjectField,
} from "./reportObjectFields";
import { executeReport, type ReportResult } from "./reportEngine";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

interface Props {
  objectName: string;
  reportName: string;
  config: VisualReportConfig;
  onConfigChange: (config: VisualReportConfig) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
}

export function ReportBuilderVisual({
  objectName, reportName, config, onConfigChange, onNameChange, onSave, onBack, saving,
}: Props) {
  const obj = OBJECT_MAP[objectName];
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    fields: true, filters: true, grouping: false, sorting: false, visualization: true, summary: false,
  });

  const toggleSection = (s: string) => setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));
  const update = (partial: Partial<VisualReportConfig>) => onConfigChange({ ...config, ...partial });

  const handleExecute = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await executeReport(objectName, config, p);
      setResult(r);
      setPage(p);
    } catch (e: any) {
      toast.error("Erro ao executar: " + (e.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }, [objectName, config]);

  if (!obj) return <div className="p-4 text-destructive">Objeto não encontrado: {objectName}</div>;

  const fields = obj.fields;
  const filterableFields = fields.filter((f) => f.filterable);
  const sortableFields = fields.filter((f) => f.sortable);
  const groupableFields = fields.filter((f) => f.groupable);
  const summarizableFields = fields.filter((f) => f.summarizable);

  // Field toggles
  const toggleField = (name: string) => {
    const sel = config.selectedFields.includes(name)
      ? config.selectedFields.filter((f) => f !== name)
      : [...config.selectedFields, name];
    update({ selectedFields: sel });
  };

  const selectAllFields = () => update({ selectedFields: fields.map((f) => f.name) });
  const selectNoneFields = () => update({ selectedFields: [] });
  const selectDefaultFields = () => update({ selectedFields: obj.defaultFields });

  // Filters
  const addFilter = () => {
    const id = crypto.randomUUID();
    update({ filters: [...config.filters, { id, field: filterableFields[0]?.name || "", operator: "eq", value: "" }] });
  };
  const updateFilter = (id: string, patch: Partial<ReportFilter>) => {
    update({ filters: config.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };
  const removeFilter = (id: string) => update({ filters: config.filters.filter((f) => f.id !== id) });

  // Sorting
  const addSort = () => {
    update({ orderBy: [...config.orderBy, { field: sortableFields[0]?.name || "created_at", direction: "asc" }] });
  };
  const updateSort = (idx: number, patch: Partial<ReportSort>) => {
    const newOb = [...config.orderBy];
    newOb[idx] = { ...newOb[idx], ...patch };
    update({ orderBy: newOb });
  };
  const removeSort = (idx: number) => update({ orderBy: config.orderBy.filter((_, i) => i !== idx) });

  // Summary
  const addSummaryField = () => {
    update({
      summaryFields: [...config.summaryFields, { field: summarizableFields[0]?.name || "", fn: "sum", label: "" }],
    });
  };
  const updateSummaryField = (idx: number, patch: Partial<ReportSummaryField>) => {
    const newSf = [...config.summaryFields];
    newSf[idx] = { ...newSf[idx], ...patch };
    update({ summaryFields: newSf });
  };
  const removeSummaryField = (idx: number) => update({ summaryFields: config.summaryFields.filter((_, i) => i !== idx) });

  const totalPages = result ? Math.ceil(result.totalCount / 15) : 0;

  const SectionHeader = ({ title, section, count }: { title: string; section: string; count?: number }) => (
    <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 hover:bg-muted/50 rounded-md text-sm font-medium">
      {openSections[section] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      {title}
      {count !== undefined && count > 0 && <Badge variant="secondary" className="ml-auto text-xs">{count}</Badge>}
    </CollapsibleTrigger>
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <Input value={reportName} onChange={(e) => onNameChange(e.target.value)} className="max-w-xs font-semibold" />
        <Badge variant="outline">{obj.label}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => handleExecute(1)} disabled={loading} size="sm">
            <Play className="h-4 w-4 mr-1" />{loading ? "Executando..." : "Executar"}
          </Button>
          <Button variant="outline" onClick={onSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" />{saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Panel */}
        <ScrollArea className="w-80 shrink-0 border rounded-lg bg-card">
          <div className="p-3 space-y-1">
            {/* Fields */}
            <Collapsible open={openSections.fields} onOpenChange={() => toggleSection("fields")}>
              <SectionHeader title="Campos" section="fields" count={config.selectedFields.length} />
              <CollapsibleContent className="px-3 pb-3 space-y-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllFields}>Todos</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectNoneFields}>Nenhum</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectDefaultFields}>Padrão</Button>
                </div>
                {fields.map((f) => (
                  <label key={f.name} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={config.selectedFields.includes(f.name)} onCheckedChange={() => toggleField(f.name)} />
                    {f.label}
                  </label>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Filters */}
            <Collapsible open={openSections.filters} onOpenChange={() => toggleSection("filters")}>
              <SectionHeader title="Filtros" section="filters" count={config.filters.length} />
              <CollapsibleContent className="px-3 pb-3 space-y-3">
                {config.filters.map((filter) => {
                  const fieldDef = fields.find((f) => f.name === filter.field);
                  const ops = FILTER_OPERATORS.filter((op) => !fieldDef || op.types.includes(fieldDef.type));
                  return (
                    <div key={filter.id} className="space-y-1.5 border-b pb-2 border-border">
                      <div className="flex gap-1">
                        <Select value={filter.field} onValueChange={(v) => updateFilter(filter.id, { field: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{filterableFields.map((f) => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFilter(filter.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      <Select value={filter.operator} onValueChange={(v: any) => updateFilter(filter.id, { operator: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ops.map((op) => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {filter.operator !== "is" && (
                        <Input className="h-8 text-xs" placeholder="Valor" value={filter.value} onChange={(e) => updateFilter(filter.id, { value: e.target.value })} />
                      )}
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={addFilter}><Plus className="h-3 w-3 mr-1" />Adicionar Filtro</Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Grouping */}
            <Collapsible open={openSections.grouping} onOpenChange={() => toggleSection("grouping")}>
              <SectionHeader title="Agrupamento" section="grouping" count={config.groupBy.length} />
              <CollapsibleContent className="px-3 pb-3 space-y-2">
                {config.groupBy.map((g, idx) => (
                  <div key={idx} className="flex gap-1 items-center">
                    <Badge variant="secondary" className="text-xs shrink-0">{idx + 1}</Badge>
                    <Select value={g} onValueChange={(v) => { const nb = [...config.groupBy]; nb[idx] = v; update({ groupBy: nb }); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{groupableFields.map((f) => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => update({ groupBy: config.groupBy.filter((_, i) => i !== idx) })}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => update({ groupBy: [...config.groupBy, groupableFields[0]?.name || ""] })}><Plus className="h-3 w-3 mr-1" />Adicionar Agrupamento</Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Sorting */}
            <Collapsible open={openSections.sorting} onOpenChange={() => toggleSection("sorting")}>
              <SectionHeader title="Ordenação" section="sorting" count={config.orderBy.length} />
              <CollapsibleContent className="px-3 pb-3 space-y-2">
                {config.orderBy.map((s, idx) => (
                  <div key={idx} className="flex gap-1 items-center">
                    <Select value={s.field} onValueChange={(v) => updateSort(idx, { field: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{sortableFields.map((f) => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateSort(idx, { direction: s.direction === "asc" ? "desc" : "asc" })}>
                      {s.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeSort(idx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={addSort}><Plus className="h-3 w-3 mr-1" />Adicionar Ordenação</Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Visualization */}
            <Collapsible open={openSections.visualization} onOpenChange={() => toggleSection("visualization")}>
              <SectionHeader title="Visualização" section="visualization" />
              <CollapsibleContent className="px-3 pb-3 space-y-3">
                <div className="flex gap-2">
                  {(["table", "chart", "summary"] as const).map((v) => (
                    <Button key={v} variant={config.visualization === v ? "default" : "outline"} size="sm" className="text-xs flex-1"
                      onClick={() => update({ visualization: v })}>
                      {v === "table" ? "Tabela" : v === "chart" ? "Gráfico" : "Resumo"}
                    </Button>
                  ))}
                </div>
                {config.visualization === "chart" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={config.chartType || "bar"} onValueChange={(v: any) => update({ chartType: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Barras</SelectItem>
                        <SelectItem value="line">Linhas</SelectItem>
                        <SelectItem value="pie">Pizza</SelectItem>
                        <SelectItem value="area">Área</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label className="text-xs">Campo X</Label>
                    <Select value={config.chartXField || ""} onValueChange={(v) => update({ chartXField: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{groupableFields.map((f) => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Label className="text-xs">Campo Y</Label>
                    <Select value={config.chartYField || ""} onValueChange={(v) => update({ chartYField: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Contagem" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Contagem</SelectItem>
                        {summarizableFields.map((f) => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {config.chartYField && (
                      <>
                        <Label className="text-xs">Função Y</Label>
                        <Select value={config.chartYFunction || "sum"} onValueChange={(v: any) => update({ chartYFunction: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{SUMMARY_FUNCTIONS.map((sf) => <SelectItem key={sf.value} value={sf.value}>{sf.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Summary */}
            <Collapsible open={openSections.summary} onOpenChange={() => toggleSection("summary")}>
              <SectionHeader title="Resumo" section="summary" count={config.summaryFields.length} />
              <CollapsibleContent className="px-3 pb-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={config.summaryEnabled} onCheckedChange={(v) => update({ summaryEnabled: v })} />
                  <Label className="text-xs">Habilitar resumo</Label>
                </div>
                {config.summaryEnabled && (
                  <>
                    {config.summaryFields.map((sf, idx) => (
                      <div key={idx} className="space-y-1.5 border-b pb-2 border-border">
                        <div className="flex gap-1">
                          <Select value={sf.field} onValueChange={(v) => updateSummaryField(idx, { field: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{summarizableFields.map((f) => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={sf.fn} onValueChange={(v: any) => updateSummaryField(idx, { fn: v })}>
                            <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>{SUMMARY_FUNCTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeSummaryField(idx)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                        <Input className="h-8 text-xs" placeholder="Label" value={sf.label} onChange={(e) => updateSummaryField(idx, { label: e.target.value })} />
                      </div>
                    ))}
                    {summarizableFields.length > 0 && (
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={addSummaryField}><Plus className="h-3 w-3 mr-1" />Adicionar Campo</Button>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Preview Area */}
        <div className="flex-1 min-w-0 border rounded-lg bg-card p-4 flex flex-col">
          {!result && !loading && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Clique em "Executar" para ver o preview do relatório
            </div>
          )}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {result && !loading && (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Summary cards */}
              {config.summaryEnabled && result.summaryValues.length > 0 && (
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

              {/* Table view */}
              {config.visualization === "table" && (
                <div className="flex-1 min-h-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {config.selectedFields.map((f) => {
                          const fd = fields.find((x) => x.name === f);
                          return <TableHead key={f} className="text-xs">{fd?.label || f}</TableHead>;
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {config.selectedFields.map((f) => (
                            <TableCell key={f} className="text-xs">{formatCell(row[f], fields.find((x) => x.name === f))}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {result.rows.length === 0 && (
                        <TableRow><TableCell colSpan={config.selectedFields.length} className="text-center text-muted-foreground text-sm py-8">Nenhum registro encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{result.totalCount} registros • Página {page} de {totalPages}</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handleExecute(page - 1)}>Anterior</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handleExecute(page + 1)}>Próxima</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chart view */}
              {config.visualization === "chart" && result.groupedData.length > 0 && (
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart(config.chartType || "bar", result.groupedData)}
                  </ResponsiveContainer>
                </div>
              )}
              {config.visualization === "chart" && result.groupedData.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Configure o Campo X na seção Visualização para gerar o gráfico
                </div>
              )}

              {/* Summary view */}
              {config.visualization === "summary" && (
                <div className="flex-1 flex items-center justify-center">
                  {result.summaryValues.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground">Habilite campos de Resumo no painel esquerdo</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCell(value: any, field?: ObjectField): string {
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
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" name="Valor" />
        </LineChart>
      );
    case "pie":
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="80%" label>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
    case "area":
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="value" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} name="Valor" />
        </AreaChart>
      );
    default:
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="hsl(var(--primary))" name="Valor" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
  }
}
