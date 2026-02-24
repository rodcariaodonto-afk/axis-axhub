import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, MoreHorizontal, ArrowRightCircle, Pencil, Trash2, Upload, Download, Users, Target } from "lucide-react";
import { emitEvent } from "@/lib/emitEvent";

const statusLabels: Record<string, string> = { new: "Novo", contacted: "Contatado", qualified: "Qualificado", unqualified: "Desqualificado", converted: "Convertido" };
const sourceLabels: Record<string, string> = { manual: "Manual", website: "Website", referral: "Indicação", social: "Redes Sociais", ads: "Anúncios" };

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [convertDialog, setConvertDialog] = useState(false);
  const [convertLead, setConvertLead] = useState<any>(null);
  const [dealName, setDealName] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "manual", score: "0", notes: "" });
  const { toast } = useToast();

  // CSV import state
  const [csvDialog, setCsvDialog] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({ name: "", email: "", phone: "", source: "" });
  const [csvStep, setCsvStep] = useState<"upload" | "map" | "preview">("upload");
  const [csvTags, setCsvTags] = useState<string[]>([]);
  const [csvTagInput, setCsvTagInput] = useState("");

  // Dedup state
  const [dedupDialog, setDedupDialog] = useState(false);
  const [dupGroups, setDupGroups] = useState<any[][]>([]);

  // Scoring state
  const [scoringDialog, setScoringDialog] = useState(false);
  const [scoringRules, setScoringRules] = useState<any[]>([]);
  const [ruleForm, setRuleForm] = useState({ criteria: "", points: "10" });

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads(data || []); setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditingId(null); setForm({ name: "", email: "", phone: "", source: "manual", score: "0", notes: "" }); setDialogOpen(true); };
  const openEdit = (lead: any) => { setEditingId(lead.id); setForm({ name: lead.name, email: lead.email || "", phone: lead.phone || "", source: lead.source || "manual", score: String(lead.score || 0), notes: lead.notes || "" }); setDialogOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from("leads").update({ name: form.name, email: form.email || null, phone: form.phone || null, source: form.source, score: parseInt(form.score) || 0, notes: form.notes || null }).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Lead atualizado!" }); setDialogOpen(false); fetchData(); }
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (!profile) return;
      const { data: newLead, error } = await supabase.from("leads").insert({ tenant_id: profile.tenant_id, name: form.name, email: form.email || null, phone: form.phone || null, source: form.source, score: parseInt(form.score) || 0, notes: form.notes || null }).select().single();
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Lead criado!" }); setDialogOpen(false); fetchData();
        emitEvent("lead.created", { lead_id: newLead.id, name: newLead.name, source: newLead.source });
      }
    }
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Lead excluído!" }); fetchData(); }
  };

  const openConvert = (lead: any) => { setConvertLead(lead); setDealName(lead.name); setDealValue(""); setConvertDialog(true); };

  const handleConvert = async () => {
    if (!convertLead) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { data: pipeline } = await supabase.from("sales_pipelines").select("id").eq("is_default", true).single();
    if (!pipeline) { toast({ title: "Erro", description: "Nenhum pipeline padrão encontrado.", variant: "destructive" }); return; }
    const { data: firstStage } = await supabase.from("pipeline_stages").select("id").eq("pipeline_id", pipeline.id).order("order", { ascending: true }).limit(1).single();
    if (!firstStage) return;

    // 1. Criar ou buscar crm_account
    let accountId: string | null = null;
    const companyName = convertLead.company || convertLead.name;
    const { data: existingAccount } = await supabase.from("crm_accounts").select("id").eq("name", companyName).limit(1).single();
    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      const { data: newAccount } = await supabase.from("crm_accounts").insert({
        tenant_id: profile.tenant_id, name: companyName,
        email: convertLead.email || null, phone: convertLead.phone || null,
      }).select("id").single();
      accountId = newAccount?.id || null;
    }

    // 2. Criar contact vinculado ao account
    let contactId: string | null = null;
    const { data: newContact } = await supabase.from("contacts").insert({
      tenant_id: profile.tenant_id, first_name: convertLead.name,
      email: convertLead.email || null, phone: convertLead.phone || null,
      account_id: accountId, is_primary: true,
    }).select("id").single();
    contactId = newContact?.id || null;

    // 3. Criar deal vinculado ao account e contact
    const { error } = await supabase.from("deals").insert({
      tenant_id: profile.tenant_id, pipeline_id: pipeline.id, stage_id: firstStage.id, name: dealName,
      lead_id: convertLead.id, estimated_value: parseFloat(dealValue) || 0,
      account_id: accountId, contact_id: contactId,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }

    // 4. Marcar lead como convertido
    await supabase.from("leads").update({ status: "converted", is_converted: true, converted_at: new Date().toISOString() } as any).eq("id", convertLead.id);
    emitEvent("lead.status_changed", { lead_id: convertLead.id, old_status: convertLead.status, new_status: "converted" });
    toast({ title: "Lead convertido!", description: "Account, Contact e Deal criados automaticamente." }); setConvertDialog(false); fetchData();
  };

  // === CSV Import ===
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast({ title: "CSV vazio ou inválido", variant: "destructive" }); return; }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
      setCsvHeaders(headers);
      setCsvData(rows);
      // Auto-map obvious columns
      const mapping: Record<string, string> = { name: "", email: "", phone: "", source: "" };
      headers.forEach((h) => {
        const lower = h.toLowerCase();
        if (lower.includes("nome") || lower === "name") mapping.name = h;
        else if (lower.includes("email") || lower.includes("e-mail")) mapping.email = h;
        else if (lower.includes("telefone") || lower.includes("phone") || lower.includes("tel")) mapping.phone = h;
        else if (lower.includes("fonte") || lower.includes("source") || lower.includes("origem")) mapping.source = h;
      });
      setCsvMapping(mapping);
      setCsvStep("map");
    };
    reader.readAsText(file);
  };

  const confirmCsvImport = async () => {
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const nameIdx = csvHeaders.indexOf(csvMapping.name);
    if (nameIdx === -1) { toast({ title: "Mapear coluna Nome é obrigatório", variant: "destructive" }); return; }
    const emailIdx = csvMapping.email ? csvHeaders.indexOf(csvMapping.email) : -1;
    const phoneIdx = csvMapping.phone ? csvHeaders.indexOf(csvMapping.phone) : -1;
    const sourceIdx = csvMapping.source ? csvHeaders.indexOf(csvMapping.source) : -1;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRows: any[] = [];
    let ignored = 0;

    for (const row of csvData) {
      const name = row[nameIdx]?.trim();
      if (!name) { ignored++; continue; }
      const email = emailIdx >= 0 ? row[emailIdx]?.trim() : null;
      if (email && !emailRegex.test(email)) { ignored++; continue; }
      validRows.push({
        tenant_id: profile.tenant_id, name,
        email: email || null,
        phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || null : null,
        source: sourceIdx >= 0 ? row[sourceIdx]?.trim() || "manual" : "manual",
        tags: csvTags.length > 0 ? csvTags : [],
      });
    }

    // Batch insert (50 at a time)
    let imported = 0;
    for (let i = 0; i < validRows.length; i += 50) {
      const batch = validRows.slice(i, i + 50);
      const { error } = await supabase.from("leads").insert(batch);
      if (!error) imported += batch.length;
      else ignored += batch.length;
    }

    toast({ title: `Importação concluída!`, description: `${imported} importados, ${ignored} ignorados` });
    setCsvDialog(false); setCsvStep("upload"); setCsvData([]); setCsvTags([]); setCsvTagInput(""); fetchData();
  };

  // === CSV Export ===
  const exportLeadsCsv = () => {
    const header = "Nome,Email,Telefone,Fonte,Score,Status,Criado Em";
    const rows = leads.map((l) =>
      `"${l.name}","${l.email || ""}","${l.phone || ""}","${sourceLabels[l.source] || l.source}",${l.score || 0},"${statusLabels[l.status] || l.status}","${new Date(l.created_at).toLocaleDateString("pt-BR")}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // === Deduplication ===
  const checkDuplicates = () => {
    const groups: Record<string, any[]> = {};
    leads.forEach((l) => {
      const keys: string[] = [];
      if (l.email) keys.push(`email:${l.email.toLowerCase()}`);
      if (l.phone) keys.push(`phone:${l.phone.replace(/\D/g, "")}`);
      keys.forEach((k) => {
        if (!groups[k]) groups[k] = [];
        if (!groups[k].find((x: any) => x.id === l.id)) groups[k].push(l);
      });
    });
    const dups = Object.values(groups).filter((g) => g.length > 1);
    setDupGroups(dups);
    setDedupDialog(true);
    if (dups.length === 0) toast({ title: "Nenhum duplicado encontrado!" });
  };

  const mergeDuplicates = async (group: any[]) => {
    const sorted = [...group].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const keep = sorted[0];
    const remove = sorted.slice(1);

    for (const dup of remove) {
      // Transfer references
      await supabase.from("deals").update({ lead_id: keep.id }).eq("lead_id", dup.id);
      await supabase.from("activities").update({ lead_id: keep.id }).eq("lead_id", dup.id);
      // Fill missing data on keeper
      const updates: any = {};
      if (!keep.email && dup.email) updates.email = dup.email;
      if (!keep.phone && dup.phone) updates.phone = dup.phone;
      if (!keep.notes && dup.notes) updates.notes = dup.notes;
      if (Object.keys(updates).length > 0) await supabase.from("leads").update(updates).eq("id", keep.id);
      await supabase.from("leads").delete().eq("id", dup.id);
    }

    toast({ title: `${remove.length} duplicado(s) mesclado(s)` });
    setDupGroups((prev) => prev.filter((g) => g !== group));
    fetchData();
  };

  // === Lead Scoring ===
  const openScoring = async () => {
    const { data } = await supabase.from("lead_scoring_rules").select("*").order("created_at");
    setScoringRules(data || []);
    setScoringDialog(true);
  };

  const addRule = async () => {
    if (!ruleForm.criteria) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    await supabase.from("lead_scoring_rules").insert({ tenant_id: profile.tenant_id, criteria: ruleForm.criteria, points: parseInt(ruleForm.points) || 0 });
    setRuleForm({ criteria: "", points: "10" });
    const { data } = await supabase.from("lead_scoring_rules").select("*").order("created_at");
    setScoringRules(data || []);
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from("lead_scoring_rules").update({ is_active: !active }).eq("id", id);
    const { data } = await supabase.from("lead_scoring_rules").select("*").order("created_at");
    setScoringRules(data || []);
  };

  const deleteRule = async (id: string) => {
    await supabase.from("lead_scoring_rules").delete().eq("id", id);
    const { data } = await supabase.from("lead_scoring_rules").select("*").order("created_at");
    setScoringRules(data || []);
  };

  const evaluateRule = (lead: any, criteria: string): boolean => {
    if (criteria === "has_email") return !!lead.email;
    if (criteria === "has_phone") return !!lead.phone;
    if (criteria.includes("=")) {
      const [field, value] = criteria.split("=");
      return lead[field] === value;
    }
    return false;
  };

  const recalculateScores = async () => {
    const activeRules = scoringRules.filter((r) => r.is_active);
    if (activeRules.length === 0) { toast({ title: "Nenhuma regra ativa" }); return; }
    let updated = 0;
    for (const lead of leads) {
      let score = 0;
      for (const rule of activeRules) {
        if (evaluateRule(lead, rule.criteria)) score += rule.points;
      }
      if (score !== (lead.score || 0)) {
        await supabase.from("leads").update({ score }).eq("id", lead.id);
        updated++;
      }
    }
    emitEvent("lead.scored", { leads_updated: updated, rules_applied: activeRules.length });
    toast({ title: `Scores recalculados!`, description: `${updated} leads atualizados` });
    fetchData();
  };

  const seedDefaultRules = async () => {
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const defaults = [
      { criteria: "has_email", points: 10 },
      { criteria: "has_phone", points: 10 },
      { criteria: "source=website", points: 20 },
      { criteria: "source=referral", points: 15 },
      { criteria: "status=contacted", points: 5 },
      { criteria: "status=qualified", points: 25 },
    ];
    await supabase.from("lead_scoring_rules").insert(defaults.map((d) => ({ ...d, tenant_id: profile.tenant_id })));
    const { data } = await supabase.from("lead_scoring_rules").select("*").order("created_at");
    setScoringRules(data || []);
    toast({ title: "Regras padrão criadas!" });
  };

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || (l.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Leads</h1><p className="text-muted-foreground">Gerencie seus leads de vendas</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCsvStep("upload"); setCsvDialog(true); }}><Upload className="mr-2 h-4 w-4" />Importar CSV</Button>
          <Button variant="outline" onClick={exportLeadsCsv}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
          <Button variant="outline" onClick={checkDuplicates}><Users className="mr-2 h-4 w-4" />Verificar Duplicados</Button>
          <Button variant="outline" onClick={openScoring}><Target className="mr-2 h-4 w-4" />Regras de Score</Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Lead</Button>
        </div>
      </div>

      {/* Lead Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editingId ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fonte</Label><Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Score</Label><Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full">{editingId ? "Salvar" : "Criar Lead"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Converter Lead em Deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome do Deal</Label><Input value={dealName} onChange={(e) => setDealName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Valor Estimado (R$)</Label><Input type="number" step="0.01" value={dealValue} onChange={(e) => setDealValue(e.target.value)} /></div>
            <Button onClick={handleConvert} className="w-full">Converter</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvDialog} onOpenChange={setCsvDialog}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle>Importar Leads via CSV</DialogTitle></DialogHeader>
          {csvStep === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Selecione um arquivo CSV com seus leads. A primeira linha deve conter os cabeçalhos.</p>
              <Input type="file" accept=".csv" onChange={handleCsvFile} />
            </div>
          )}
          {csvStep === "map" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Mapeie as colunas do CSV para os campos do lead:</p>
              {["name", "email", "phone", "source"].map((field) => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="capitalize">{field === "name" ? "Nome *" : field === "email" ? "E-mail" : field === "phone" ? "Telefone" : "Fonte"}</Label>
                  <Select value={csvMapping[field] || "__ignore__"} onValueChange={(v) => setCsvMapping({ ...csvMapping, [field]: v === "__ignore__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione coluna" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ignore__">— Ignorar —</SelectItem>
                      {csvHeaders.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="space-y-2">
                <Label>Tags para esta importação</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma tag e pressione Enter"
                    value={csvTagInput}
                    onChange={(e) => setCsvTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const tag = csvTagInput.trim();
                        if (tag && !csvTags.includes(tag)) setCsvTags([...csvTags, tag]);
                        setCsvTagInput("");
                      }
                    }}
                  />
                </div>
                {csvTags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {csvTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => setCsvTags(csvTags.filter((t) => t !== tag))}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">As tags serão aplicadas a todos os leads importados. Útil para segmentar campanhas.</p>
              </div>
              <Button onClick={() => setCsvStep("preview")} className="w-full" disabled={!csvMapping.name}>Preview</Button>
            </div>
          )}
          {csvStep === "preview" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Preview das primeiras 5 linhas ({csvData.length} total):</p>
              {csvTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Tags:</span>
                  {csvTags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              )}
              <div className="overflow-auto max-h-48 border border-border rounded">
                <Table>
                  <TableHeader><TableRow>{csvHeaders.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>{csvData.slice(0, 5).map((row, i) => <TableRow key={i}>{row.map((c, j) => <TableCell key={j} className="text-xs py-1">{c}</TableCell>)}</TableRow>)}</TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCsvStep("map")} className="flex-1">Voltar</Button>
                <Button onClick={confirmCsvImport} className="flex-1">Importar {csvData.length} leads</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dedup Dialog */}
      <Dialog open={dedupDialog} onOpenChange={setDedupDialog}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle>Leads Duplicados ({dupGroups.length} grupos)</DialogTitle></DialogHeader>
          {dupGroups.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Nenhum duplicado encontrado!</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-auto">
              {dupGroups.map((group, gi) => (
                <Card key={gi} className="border-border">
                  <CardContent className="p-3 space-y-2">
                    {group.map((l) => (
                      <div key={l.id} className="flex justify-between text-sm">
                        <span className="font-medium">{l.name}</span>
                        <span className="text-muted-foreground">{l.email || l.phone || "—"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => mergeDuplicates(group)} className="w-full">Mesclar (manter mais antigo)</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={scoringDialog} onOpenChange={setScoringDialog}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Regras de Lead Scoring</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {scoringRules.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-2">Nenhuma regra. Adicione regras padrão?</p>
                <Button variant="outline" size="sm" onClick={seedDefaultRules}>Criar Regras Padrão</Button>
              </div>
            )}
            {scoringRules.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded border border-border">
                <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r.id, r.is_active)} />
                <code className="flex-1 text-xs bg-muted px-2 py-1 rounded">{r.criteria}</code>
                <Badge variant={r.points > 0 ? "default" : "destructive"}>{r.points > 0 ? "+" : ""}{r.points}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRule(r.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Ex: has_email, source=website" value={ruleForm.criteria} onChange={(e) => setRuleForm({ ...ruleForm, criteria: e.target.value })} className="flex-1" />
              <Input type="number" value={ruleForm.points} onChange={(e) => setRuleForm({ ...ruleForm, points: e.target.value })} className="w-20" />
              <Button size="sm" onClick={addRule}>Adicionar</Button>
            </div>
            <Button onClick={recalculateScores} className="w-full">Recalcular Scores de Todos os Leads</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 items-center">
        <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="border-border"><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Fonte</TableHead><TableHead>Tags</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
               {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</TableCell></TableRow> :
              filtered.map((l) => (
                <TableRow key={l.id} className="border-border">
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-muted-foreground">{l.email || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{sourceLabels[l.source] || l.source}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(l.tags || []).length > 0 ? l.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      )) : <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={l.score >= 70 ? "default" : l.score >= 40 ? "secondary" : "outline"}>{l.score}</Badge></TableCell>
                  <TableCell><Badge variant={l.status === "converted" ? "default" : l.status === "qualified" ? "default" : "secondary"}>{statusLabels[l.status] || l.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(l)}><Pencil className="mr-2 h-3 w-3" />Editar</DropdownMenuItem>
                        {l.status !== "converted" && <DropdownMenuItem onClick={() => openConvert(l)}><ArrowRightCircle className="mr-2 h-3 w-3" />Converter em Deal</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => deleteLead(l.id)} className="text-destructive"><Trash2 className="mr-2 h-3 w-3" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
