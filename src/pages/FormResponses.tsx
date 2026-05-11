import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, Trash2, Download, Search, FileText, Calendar, CheckCircle, Clock, FileEdit } from "lucide-react";
import { jsPDF } from "jspdf";
import type { FormQuestion } from "@/components/forms/formSeedData";

export default function FormResponses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [detailResponse, setDetailResponse] = useState<any>(null);

  const { data: form } = useQuery({
    queryKey: ["form", id],
    queryFn: async () => {
      const { data } = await supabase.from("forms").select("*").eq("id", id!).single();
      return data as any;
    },
  });

  const { data: responses, isLoading } = useQuery({
    queryKey: ["form-responses", id, dateFilter],
    queryFn: async () => {
      let query = supabase.from("form_responses").select("*").eq("form_id", id!).order("created_at", { ascending: false });
      if (dateFilter !== "all") {
        const days = dateFilter === "7" ? 7 : dateFilter === "30" ? 30 : 90;
        const from = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte("created_at", from);
      }
      const { data } = await query;
      return (data || []) as any[];
    },
  });

  const { data: drafts } = useQuery({
    queryKey: ["form-drafts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("form_response_drafts")
        .select("*")
        .eq("form_id", id!)
        .order("updated_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const questions: FormQuestion[] = form?.form_config || [];

  const handleDelete = async (rId: string) => {
    if (!confirm("Excluir esta resposta?")) return;
    await supabase.from("form_responses").delete().eq("id", rId);
    toast({ title: "Resposta excluída" });
    qc.invalidateQueries({ queryKey: ["form-responses", id] });
  };

  const handleDeleteDraft = async (dId: string) => {
    if (!confirm("Excluir este rascunho?")) return;
    await supabase.from("form_response_drafts").delete().eq("id", dId);
    toast({ title: "Rascunho excluído" });
    qc.invalidateQueries({ queryKey: ["form-drafts", id] });
  };

  const exportCSV = () => {
    if (!responses?.length) return;
    const headers = ["Nome", "Email", "Data", ...questions.map((q) => q.label)];
    const rows = responses.map((r: any) => [
      r.respondent_name,
      r.respondent_email,
      new Date(r.created_at).toLocaleString("pt-BR"),
      ...questions.map((q) => {
        const val = r.response_data?.[q.id];
        return Array.isArray(val) ? val.join("; ") : val || "";
      }),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form?.name || "respostas"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = (r: any) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(form?.name || "Formulário", 14, 20);
    doc.setFontSize(10);
    doc.text(`Respondente: ${r.respondent_name} (${r.respondent_email})`, 14, 30);
    doc.text(`Data: ${new Date(r.created_at).toLocaleString("pt-BR")}`, 14, 36);
    let y = 46;
    for (const q of questions) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(q.label, 14, y, { maxWidth: 180 });
      y += doc.getTextDimensions(q.label, { maxWidth: 180 }).h + 2;
      doc.setFont("helvetica", "normal");
      const val = r.response_data?.[q.id];
      const answer = Array.isArray(val) ? val.join(", ") : val || "—";
      doc.text(String(answer), 14, y, { maxWidth: 180 });
      y += doc.getTextDimensions(String(answer), { maxWidth: 180 }).h + 6;
    }
    doc.save(`${r.respondent_name}_resposta.pdf`);
  };

  const filtered = (responses || []).filter((r: any) =>
    r.respondent_name.toLowerCase().includes(search.toLowerCase()) ||
    r.respondent_email.toLowerCase().includes(search.toLowerCase())
  );

  const completed = (responses || []).filter((r: any) => r.completed).length;
  const total = responses?.length || 0;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { label: "Total de Respostas", value: total, icon: FileText },
    { label: "Taxa de Conclusão", value: `${rate}%`, icon: CheckCircle },
    { label: "Primeira Resposta", value: responses?.length ? new Date(responses[responses.length - 1].created_at).toLocaleDateString("pt-BR") : "—", icon: Calendar },
    { label: "Última Resposta", value: responses?.length ? new Date(responses[0].created_at).toLocaleDateString("pt-BR") : "—", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/forms")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{form?.name} — Respostas</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!responses?.length}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <s.icon className="h-6 w-6 text-primary" />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="responses">
        <TabsList>
          <TabsTrigger value="responses">Respostas ({responses?.length || 0})</TabsTrigger>
          <TabsTrigger value="drafts">
            Em andamento{drafts?.length ? ` (${drafts.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar respondente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Respondente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma resposta encontrada</TableCell></TableRow>
                  ) : filtered.map((r: any) => (
                    <TableRow key={r.id} className="border-border">
                      <TableCell className="font-medium">{r.respondent_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.respondent_email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant={r.completed ? "default" : "secondary"}>
                          {r.completed ? "Completo" : "Parcial"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailResponse(r)} title="Ver Detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportPDF(r)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)} title="Deletar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Quem começou a responder mas ainda não enviou. As respostas são salvas automaticamente a cada poucos segundos.
          </p>
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Respondente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Última atividade</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!drafts ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : drafts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum rascunho em andamento</TableCell></TableRow>
                  ) : drafts.map((d: any) => {
                    const answered = Object.keys(d.answers || {}).length;
                    return (
                      <TableRow key={d.id} className="border-border">
                        <TableCell className="font-medium">{d.respondent_name || <span className="text-muted-foreground italic">Sem nome ainda</span>}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {d.respondent_email || "—"}
                          {d.respondent_phone ? <div className="text-xs">{d.respondent_phone}</div> : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(d.updated_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{answered} de {questions.length} respostas</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailResponse({ ...d, response_data: d.answers, created_at: d.updated_at })} title="Ver respostas parciais"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteDraft(d.id)} title="Excluir rascunho"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail modal */}
      <Dialog open={!!detailResponse} onOpenChange={() => setDetailResponse(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Resposta</DialogTitle>
          </DialogHeader>
          {detailResponse && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span><strong>Nome:</strong> {detailResponse.respondent_name || "—"}</span>
                <span><strong>Email:</strong> {detailResponse.respondent_email || "—"}</span>
                <span><strong>Data:</strong> {new Date(detailResponse.created_at).toLocaleString("pt-BR")}</span>
              </div>
              {[...new Set(questions.map((q) => q.section))].map((section) => (
                <div key={section}>
                  <h3 className="font-semibold text-sm mb-2 text-primary">{section}</h3>
                  {questions.filter((q) => q.section === section).map((q) => {
                    const val = detailResponse.response_data?.[q.id];
                    const answer = Array.isArray(val) ? val.join(", ") : val || "—";
                    return (
                      <div key={q.id} className="mb-3">
                        <p className="text-xs text-muted-foreground">{q.label}</p>
                        <p className="text-sm">{String(answer)}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
