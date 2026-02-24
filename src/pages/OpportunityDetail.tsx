import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trophy, XCircle, Power, DollarSign, Calendar, User, Building2 } from "lucide-react";

interface Opportunity {
  id: string; name: string; description: string | null; stage: string;
  probability: number; amount: number; currency: string;
  expected_close_date: string | null; close_date: string | null; close_reason: string | null;
  owner_id: string | null; account_id: string | null; contact_id: string | null;
  is_active: boolean; tenant_id: string; created_at: string; updated_at: string;
}

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeType, setCloseType] = useState<"won" | "lost">("won");
  const [closeReason, setCloseReason] = useState("");
  const [form, setForm] = useState<any>({});

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [oppRes, stagesRes, accsRes, consRes, profsRes] = await Promise.all([
      supabase.from("opportunities").select("*").eq("id", id).single(),
      supabase.from("opportunity_stages").select("*").order("order_index"),
      supabase.from("crm_accounts").select("id, name"),
      supabase.from("contacts").select("id, first_name, last_name, account_id"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    if (oppRes.data) setOpp(oppRes.data as Opportunity);
    setStages(stagesRes.data || []);
    setAccounts(accsRes.data || []);
    setContacts(consRes.data || []);
    setProfiles(profsRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getAccountName = (aid: string | null) => accounts.find(a => a.id === aid)?.name || "—";
  const getContactName = (cid: string | null) => { const c = contacts.find(x => x.id === cid); return c ? `${c.first_name} ${c.last_name || ""}` : "—"; };
  const getOwnerName = (uid: string | null) => profiles.find(p => p.id === uid)?.full_name || "—";
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: opp?.currency || "BRL" }).format(v);

  const openEdit = () => {
    if (!opp) return;
    setForm({
      account_id: opp.account_id || "", name: opp.name, description: opp.description || "",
      stage: opp.stage, probability: String((Number(opp.probability) * 100).toFixed(0)),
      amount: String(opp.amount), currency: opp.currency,
      expected_close_date: opp.expected_close_date || "", contact_id: opp.contact_id || "", owner_id: opp.owner_id || "",
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!opp || !form.account_id || !form.name || !form.owner_id) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const prob = Number(form.probability) / 100;
    const stageObj = stages.find((s: any) => s.name === form.stage);
    const updates: any = {
      account_id: form.account_id, name: form.name, description: form.description || null,
      stage: form.stage, probability: prob, amount: Number(form.amount), currency: form.currency,
      expected_close_date: form.expected_close_date || null, contact_id: form.contact_id || null, owner_id: form.owner_id,
    };
    if ((stageObj?.is_won || stageObj?.is_lost) && !opp.close_date) {
      updates.close_date = new Date().toISOString().split("T")[0];
    }
    const { error } = await supabase.from("opportunities").update(updates).eq("id", opp.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Oportunidade atualizada!" });
    setShowEditModal(false);
    fetchData();
  };

  const handleClose = async () => {
    if (!opp) return;
    const stageName = closeType === "won" ? "Closed Won" : "Closed Lost";
    await supabase.from("opportunities").update({
      stage: stageName, close_date: new Date().toISOString().split("T")[0], close_reason: closeReason || null,
    }).eq("id", opp.id);
    toast({ title: closeType === "won" ? "Oportunidade ganha!" : "Oportunidade perdida!" });
    setShowCloseModal(false);
    fetchData();
  };

  const deactivate = async () => {
    if (!opp) return;
    await supabase.from("opportunities").update({ is_active: false }).eq("id", opp.id);
    toast({ title: "Oportunidade desativada" });
    navigate("/opportunities");
  };

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!opp) return <div className="p-6">Oportunidade não encontrada.</div>;

  const stageObj = stages.find((s: any) => s.name === opp.stage);
  const weighted = Number(opp.amount) * Number(opp.probability);
  const daysToClose = opp.expected_close_date ? Math.ceil((new Date(opp.expected_close_date).getTime() - Date.now()) / 86400000) : null;
  const filteredContacts = form.account_id ? contacts.filter(c => c.account_id === form.account_id) : contacts;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/opportunities")}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">{opp.name}</h1>
          <Badge style={{ backgroundColor: stageObj?.color, color: "#fff" }}>{opp.stage}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}><Edit className="h-4 w-4 mr-1" />Editar</Button>
          {!stageObj?.is_won && !stageObj?.is_lost && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setCloseType("won"); setCloseReason(""); setShowCloseModal(true); }}><Trophy className="h-4 w-4 mr-1" />Ganhar</Button>
              <Button variant="destructive" size="sm" onClick={() => { setCloseType("lost"); setCloseReason(""); setShowCloseModal(true); }}><XCircle className="h-4 w-4 mr-1" />Perder</Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={deactivate}><Power className="h-4 w-4 mr-1" />Desativar</Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" />Informações</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Conta</span>{opp.account_id ? <button onClick={() => navigate(`/accounts/${opp.account_id}`)} className="text-primary hover:underline">{getAccountName(opp.account_id)}</button> : <span>—</span>}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contato</span><span>{getContactName(opp.contact_id)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Proprietário</span><span>{getOwnerName(opp.owner_id)}</span></div>
          </CardContent>
        </Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Financeiro</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-semibold">{fmt(Number(opp.amount))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Probabilidade</span><span>{(Number(opp.probability) * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor Ponderado</span><span className="font-semibold">{fmt(weighted)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Moeda</span><span>{opp.currency}</span></div>
          </CardContent>
        </Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" />Datas</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Fech. Esperado</span><span>{opp.expected_close_date || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fech. Real</span><span>{opp.close_date || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dias até Fech.</span>
              <span className={daysToClose !== null ? (daysToClose < 0 ? "text-destructive font-semibold" : daysToClose <= 7 ? "text-yellow-600 font-semibold" : "text-green-600 font-semibold") : ""}>
                {daysToClose !== null ? daysToClose : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description & Close Reason */}
      {opp.description && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Descrição</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{opp.description}</p></CardContent></Card>}
      {opp.close_reason && <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Motivo do Fechamento</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{opp.close_reason}</p></CardContent></Card>}

      {/* Tabs */}
      <Tabs defaultValue="activities"><TabsList><TabsTrigger value="activities">Atividades</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList>
        <TabsContent value="activities"><Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma atividade registrada.</CardContent></Card></TabsContent>
        <TabsContent value="history"><Card><CardContent className="py-8 text-center text-muted-foreground">Histórico será implementado em breve.</CardContent></Card></TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Oportunidade</DialogTitle><DialogDescription>Atualize os dados da oportunidade.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Conta *</Label><Select value={form.account_id} onValueChange={v => setForm((f: any) => ({ ...f, account_id: v, contact_id: "" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Nome *</Label><Input value={form.name || ""} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description || ""} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Estágio</Label><Select value={form.stage} onValueChange={v => setForm((f: any) => ({ ...f, stage: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Probabilidade (%)</Label><Input type="number" min={0} max={100} value={form.probability || "0"} onChange={e => setForm((f: any) => ({ ...f, probability: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor</Label><Input type="number" min={0} value={form.amount || "0"} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Moeda</Label><Select value={form.currency || "BRL"} onValueChange={v => setForm((f: any) => ({ ...f, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Data Fech. Esperada</Label><Input type="date" value={form.expected_close_date || ""} onChange={e => setForm((f: any) => ({ ...f, expected_close_date: e.target.value }))} /></div>
            <div><Label>Contato</Label><Select value={form.contact_id || "none"} onValueChange={v => setForm((f: any) => ({ ...f, contact_id: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{filteredContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Proprietário *</Label><Select value={form.owner_id} onValueChange={v => setForm((f: any) => ({ ...f, owner_id: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button><Button onClick={saveEdit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{closeType === "won" ? "Marcar como Ganha" : "Marcar como Perdida"}</DialogTitle><DialogDescription>Informe o motivo do fechamento.</DialogDescription></DialogHeader>
          <div><Label>Motivo</Label><Textarea value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="Descreva o motivo..." /></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button><Button onClick={handleClose}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
