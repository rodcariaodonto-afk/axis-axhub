import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Kanban, List, Search, DollarSign, Target, TrendingUp, Trophy, XCircle, Columns } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Opportunity {
  id: string;
  name: string;
  description: string | null;
  stage: string;
  probability: number;
  amount: number;
  currency: string;
  expected_close_date: string | null;
  close_date: string | null;
  close_reason: string | null;
  owner_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

interface Stage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

const DEFAULT_STAGES: Omit<Stage, "id">[] = [
  { name: "Prospecting", order_index: 1, color: "#6B7280", is_won: false, is_lost: false },
  { name: "Qualification", order_index: 2, color: "#3B82F6", is_won: false, is_lost: false },
  { name: "Proposal", order_index: 3, color: "#8B5CF6", is_won: false, is_lost: false },
  { name: "Negotiation", order_index: 4, color: "#F59E0B", is_won: false, is_lost: false },
  { name: "Closed Won", order_index: 5, color: "#10B981", is_won: true, is_lost: false },
  { name: "Closed Lost", order_index: 6, color: "#EF4444", is_won: false, is_lost: true },
];

export default function Opportunities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageForm, setStageForm] = useState({ name: "", color: "#6B7280", is_won: false, is_lost: false });
  const [closingOpp, setClosingOpp] = useState<{ id: string; stage: string } | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [page, setPage] = useState(0);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    account_id: "", name: "", description: "", stage: "Prospecting",
    probability: "0", amount: "0", currency: "BRL",
    expected_close_date: "", contact_id: "", owner_id: "",
  });

  const [tenantId, setTenantId] = useState<string | null>(null);

  const fetchTenantId = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    return data?.tenant_id || null;
  }, [user]);

  const ensureStages = useCallback(async (tid: string) => {
    const { data } = await supabase.from("opportunity_stages").select("*").eq("tenant_id", tid).order("order_index");
    if (data && data.length > 0) return data as Stage[];
    // Create default stages
    const toInsert = DEFAULT_STAGES.map(s => ({ ...s, tenant_id: tid }));
    const { data: created } = await supabase.from("opportunity_stages").insert(toInsert).select();
    return (created || []) as Stage[];
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const tid = await fetchTenantId();
    if (!tid) { setLoading(false); return; }
    setTenantId(tid);

    const [stagesRes, oppsRes, accsRes, consRes, profsRes] = await Promise.all([
      ensureStages(tid),
      supabase.from("opportunities").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("crm_accounts").select("id, name").eq("is_active", true),
      supabase.from("contacts").select("id, first_name, last_name, account_id"),
      supabase.from("profiles").select("id, full_name"),
    ]);

    setStages(stagesRes);
    setOpportunities((oppsRes.data || []) as Opportunity[]);
    setAccounts(accsRes.data || []);
    setContacts(consRes.data || []);
    setProfiles(profsRes.data || []);
    setLoading(false);
  }, [fetchTenantId, ensureStages]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = opportunities.filter(o => {
    if (searchTerm && !o.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterOwner !== "all" && o.owner_id !== filterOwner) return false;
    if (filterAccount !== "all" && o.account_id !== filterAccount) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, o) => s + Number(o.amount), 0);
  const weightedAmount = filtered.reduce((s, o) => s + Number(o.amount) * Number(o.probability), 0);
  const wonCount = filtered.filter(o => stages.find(s => s.name === o.stage)?.is_won).length;
  const lostCount = filtered.filter(o => stages.find(s => s.name === o.stage)?.is_lost).length;
  const closedCount = wonCount + lostCount;
  const conversionRate = closedCount > 0 ? ((wonCount / closedCount) * 100).toFixed(1) : "0";

  const getAccountName = (id: string | null) => accounts.find(a => a.id === id)?.name || "—";
  const getOwnerName = (id: string | null) => profiles.find(p => p.id === id)?.full_name || "—";

  const handleCreate = async () => {
    if (!form.account_id || !form.name || !form.owner_id || !tenantId) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const prob = Number(form.probability) / 100;
    if (prob < 0 || prob > 1) { toast({ title: "Probabilidade deve ser 0-100%", variant: "destructive" }); return; }
    const amt = Number(form.amount);
    if (amt < 0) { toast({ title: "Valor deve ser positivo", variant: "destructive" }); return; }

    const { error } = await supabase.from("opportunities").insert({
      tenant_id: tenantId, account_id: form.account_id, name: form.name,
      description: form.description || null, stage: form.stage, probability: prob,
      amount: amt, currency: form.currency,
      expected_close_date: form.expected_close_date || null,
      contact_id: form.contact_id || null, owner_id: form.owner_id,
    });
    if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Oportunidade criada!" });
    setShowNewModal(false);
    setForm({ account_id: "", name: "", description: "", stage: "Prospecting", probability: "0", amount: "0", currency: "BRL", expected_close_date: "", contact_id: "", owner_id: "" });
    fetchAll();
  };

  const moveToStage = async (oppId: string, newStage: string) => {
    const stageObj = stages.find(s => s.name === newStage);
    if (stageObj?.is_won || stageObj?.is_lost) {
      setClosingOpp({ id: oppId, stage: newStage });
      setCloseReason("");
      setShowCloseModal(true);
      return;
    }
    await supabase.from("opportunities").update({ stage: newStage }).eq("id", oppId);
    fetchAll();
  };

  const confirmClose = async () => {
    if (!closingOpp) return;
    await supabase.from("opportunities").update({
      stage: closingOpp.stage, close_date: new Date().toISOString().split("T")[0],
      close_reason: closeReason || null,
    }).eq("id", closingOpp.id);
    setShowCloseModal(false);
    setClosingOpp(null);
    toast({ title: `Oportunidade ${stages.find(s => s.name === closingOpp.stage)?.is_won ? "ganha" : "perdida"}!` });
    fetchAll();
  };

  const filteredContacts = form.account_id ? contacts.filter(c => c.account_id === form.account_id) : contacts;
  const pageSize = 10;
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Oportunidades</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")}><Kanban className="h-4 w-4 mr-1" />Kanban</Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}><List className="h-4 w-4 mr-1" />Lista</Button>
          <Button variant="outline" onClick={() => { setStageForm({ name: "", color: "#6B7280", is_won: false, is_lost: false }); setShowStageModal(true); }}><Columns className="h-4 w-4 mr-1" />Nova Coluna</Button>
          <Button onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4 mr-1" />Nova Oportunidade</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{filtered.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-xl font-bold">{fmt(totalAmount)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Valor Ponderado</p><p className="text-xl font-bold">{fmt(weightedAmount)}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Ganhas / Perdidas</p><p className="text-xl font-bold">{wonCount} / {lostCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Taxa Conversão</p><p className="text-xl font-bold">{conversionRate}%</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8 w-56" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <Select value={filterOwner} onValueChange={setFilterOwner}><SelectTrigger className="w-48"><SelectValue placeholder="Proprietário" /></SelectTrigger><SelectContent><SelectItem value="all">Todos Proprietários</SelectItem>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select>
        <Select value={filterAccount} onValueChange={setFilterAccount}><SelectTrigger className="w-48"><SelectValue placeholder="Conta" /></SelectTrigger><SelectContent><SelectItem value="all">Todas Contas</SelectItem>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.filter(s => !s.is_lost).concat(stages.filter(s => s.is_lost)).sort((a, b) => a.order_index - b.order_index).map(stage => {
            const stageOpps = filtered.filter(o => o.stage === stage.name);
            const stageTotal = stageOpps.reduce((s, o) => s + Number(o.amount), 0);
            return (
              <div key={stage.id} className="min-w-[280px] w-[280px] flex-shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (draggedId) moveToStage(draggedId, stage.name); setDraggedId(null); }}>
                <div className="rounded-lg border bg-card">
                  <div className="p-3 border-b flex items-center justify-between" style={{ borderTopColor: stage.color, borderTopWidth: 3 }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{stage.name}</span>
                      <Badge variant="secondary" className="text-xs">{stageOpps.length}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmt(stageTotal)}</span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {stageOpps.map(opp => (
                      <div key={opp.id} draggable
                        onDragStart={() => setDraggedId(opp.id)}
                        onClick={() => navigate(`/opportunities/${opp.id}`)}
                        className="p-3 rounded-md border bg-background cursor-pointer hover:shadow-md transition-shadow">
                        <p className="font-medium text-sm truncate">{opp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{getAccountName(opp.account_id)}</p>
                        <div className="flex justify-between mt-2 text-xs">
                          <span>{fmt(Number(opp.amount))}</span>
                          <span>{(Number(opp.probability) * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Ponderado: {fmt(Number(opp.amount) * Number(opp.probability))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead><TableHead>Conta</TableHead><TableHead>Estágio</TableHead>
                  <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Prob.</TableHead>
                  <TableHead className="text-right">Ponderado</TableHead><TableHead>Fech. Esperado</TableHead><TableHead>Proprietário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(opp => {
                  const stageObj = stages.find(s => s.name === opp.stage);
                  return (
                    <TableRow key={opp.id}>
                      <TableCell><button onClick={() => navigate(`/opportunities/${opp.id}`)} className="text-primary hover:underline font-medium">{opp.name}</button></TableCell>
                      <TableCell>{opp.account_id ? <button onClick={() => navigate(`/accounts/${opp.account_id}`)} className="text-primary hover:underline">{getAccountName(opp.account_id)}</button> : "—"}</TableCell>
                      <TableCell><Badge style={{ backgroundColor: stageObj?.color, color: "#fff" }}>{opp.stage}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(Number(opp.amount))}</TableCell>
                      <TableCell className="text-right">{(Number(opp.probability) * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{fmt(Number(opp.amount) * Number(opp.probability))}</TableCell>
                      <TableCell>{opp.expected_close_date || "—"}</TableCell>
                      <TableCell>{getOwnerName(opp.owner_id)}</TableCell>
                    </TableRow>
                  );
                })}
                {paged.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma oportunidade encontrada</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-sm py-2">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
            </div>
          )}
        </>
      )}

      {/* New Opportunity Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle><DialogDescription>Preencha os dados da oportunidade.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Conta *</Label><Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v, contact_id: "" }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Estágio *</Label><Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Probabilidade (%) *</Label><Input type="number" min={0} max={100} value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor</Label><Input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Moeda</Label><Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Data Fechamento Esperada</Label><Input type="date" value={form.expected_close_date} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} /></div>
            <div><Label>Contato</Label><Select value={form.contact_id} onValueChange={v => setForm(f => ({ ...f, contact_id: v }))}><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger><SelectContent>{filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Proprietário *</Label><Select value={form.owner_id} onValueChange={v => setForm(f => ({ ...f, owner_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button><Button onClick={handleCreate}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Opportunity Modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{closingOpp && stages.find(s => s.name === closingOpp.stage)?.is_won ? "Marcar como Ganha" : "Marcar como Perdida"}</DialogTitle><DialogDescription>Informe o motivo do fechamento.</DialogDescription></DialogHeader>
          <div><Label>Motivo</Label><Textarea value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="Descreva o motivo..." /></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button><Button onClick={confirmClose}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
