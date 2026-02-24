import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Pencil, CheckCircle, Power, Phone, Mail, Users,
  CheckSquare, FileText, MessageCircle, CalendarCheck,
} from "lucide-react";
import { format, isBefore, startOfDay, isSameDay } from "date-fns";

const iconMap: Record<string, any> = {
  Phone, Mail, Users, CheckSquare, FileText, MessageCircle, CalendarCheck,
};
const priorityColors: Record<string, string> = {
  Low: "bg-muted text-muted-foreground", Normal: "bg-blue-500/20 text-blue-400",
  High: "bg-yellow-500/20 text-yellow-400", Urgent: "bg-destructive/20 text-destructive",
};
const priorityLabels: Record<string, string> = { Low: "Baixa", Normal: "Normal", High: "Alta", Urgent: "Urgente" };
const statusLabels: Record<string, string> = { Open: "Aberta", Completed: "Concluída", Cancelled: "Cancelada" };
const statusColors: Record<string, string> = {
  Open: "bg-blue-500/20 text-blue-400", Completed: "bg-green-500/20 text-green-400",
  Cancelled: "bg-muted text-muted-foreground",
};

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  const fetchAll = useCallback(async () => {
    if (!id) return;
    const [aRes, tRes, acRes, cRes, oRes, ctRes, pRes] = await Promise.all([
      supabase.from("activities").select("*, contacts(first_name, last_name), deals(name), crm_accounts(name), opportunities(name), contracts(name)").eq("id", id).single(),
      supabase.from("activity_types").select("*").eq("is_active", true),
      supabase.from("crm_accounts").select("id, name").order("name"),
      supabase.from("contacts").select("id, first_name, last_name").order("first_name"),
      supabase.from("opportunities").select("id, name").eq("is_active", true).order("name"),
      supabase.from("contracts").select("id, name").eq("is_active", true).order("name"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setActivity(aRes.data);
    setActivityTypes(tRes.data || []);
    setAccounts(acRes.data || []);
    setContacts(cRes.data || []);
    setOpportunities(oRes.data || []);
    setContracts(ctRes.data || []);
    setProfiles(pRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getTypeMeta = (type: string) => activityTypes.find(t => t.name === type) || { name: type, icon: "CalendarCheck", color: "#6B7280" };
  const getOwnerName = (uid: string | null) => { const p = profiles.find(x => x.id === uid); return p ? (p.full_name || p.email) : "—"; };

  const openEdit = () => {
    if (!activity) return;
    setForm({
      type: activity.type, title: activity.title, description: activity.description || "",
      account_id: activity.account_id || "", contact_id: activity.contact_id || "",
      opportunity_id: activity.opportunity_id || "", contract_id: activity.contract_id || "",
      status: activity.status, priority: activity.priority,
      due_at: activity.due_at?.split("T")[0] || "", owner_user_id: activity.owner_user_id || "",
    });
    setEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.owner_user_id) {
      toast({ title: "Campos obrigatórios faltando", variant: "destructive" }); return;
    }
    if (!form.account_id && !form.contact_id && !form.opportunity_id && !form.contract_id) {
      toast({ title: "Vincule a pelo menos 1 registro", variant: "destructive" }); return;
    }
    const payload: any = {
      title: form.title, type: form.type, description: form.description || null,
      account_id: form.account_id || null, contact_id: form.contact_id || null,
      opportunity_id: form.opportunity_id || null, contract_id: form.contract_id || null,
      status: form.status, priority: form.priority,
      due_at: form.due_at || null, owner_user_id: form.owner_user_id,
    };
    if (form.status === "Completed" && activity.status !== "Completed") payload.done_at = new Date().toISOString();
    if (form.status === "Open" && activity.status === "Completed") payload.done_at = null;
    const { error } = await supabase.from("activities").update(payload).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Atividade atualizada!" });
    setEditOpen(false);
    fetchAll();
  };

  const handleComplete = async () => {
    await supabase.from("activities").update({ status: "Completed", done_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Atividade concluída!" });
    fetchAll();
  };

  const handleDeactivate = async () => {
    await supabase.from("activities").update({ is_active: false }).eq("id", id);
    toast({ title: "Atividade desativada" });
    navigate("/activities");
  };

  if (loading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!activity) return <div className="p-6 text-muted-foreground">Atividade não encontrada</div>;

  const meta = getTypeMeta(activity.type);
  const Icon = iconMap[meta.icon] || CalendarCheck;
  const now = new Date();
  const dueDateColor = activity.due_at && activity.status === "Open"
    ? isBefore(new Date(activity.due_at), startOfDay(now)) ? "text-destructive"
      : isSameDay(new Date(activity.due_at), now) ? "text-yellow-500" : "text-green-500"
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/activities")}><ArrowLeft className="h-5 w-5" /></Button>
          <Icon className="h-6 w-6" style={{ color: meta.color }} />
          <div>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusColors[activity.status]}>{statusLabels[activity.status]}</Badge>
              <Badge className={priorityColors[activity.priority]}>{priorityLabels[activity.priority]}</Badge>
              <Badge variant="outline">{meta.name}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
          {activity.status === "Open" && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleComplete}><CheckCircle className="h-4 w-4 mr-1" />Concluir</Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDeactivate}><Power className="h-4 w-4 mr-1" />Desativar</Button>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Relacionado a</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Conta</span>
              {activity.account_id ? <button onClick={() => navigate(`/accounts/${activity.account_id}`)} className="text-primary hover:underline">{activity.crm_accounts?.name}</button> : <span>—</span>}
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contato</span>
              <span>{activity.contacts ? `${activity.contacts.first_name} ${activity.contacts.last_name || ""}` : "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Oportunidade</span>
              {activity.opportunity_id ? <button onClick={() => navigate(`/opportunities/${activity.opportunity_id}`)} className="text-primary hover:underline">{activity.opportunities?.name}</button> : <span>—</span>}
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contrato</span>
              {activity.contract_id ? <button onClick={() => navigate(`/contracts/${activity.contract_id}`)} className="text-primary hover:underline">{activity.contracts?.name}</button> : <span>—</span>}
            </div>
            {activity.deals?.name && <div className="flex justify-between"><span className="text-muted-foreground">Deal</span><span>{activity.deals.name}</span></div>}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Datas & Responsável</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span>
              <span className={dueDateColor}>{activity.due_at ? format(new Date(activity.due_at), "dd/MM/yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Conclusão</span>
              <span>{activity.done_at ? format(new Date(activity.done_at), "dd/MM/yyyy HH:mm") : "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Atribuído a</span>
              <span>{getOwnerName(activity.owner_user_id)}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Criado por</span>
              <span>{getOwnerName(activity.created_by_id)}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span>
              <span>{format(new Date(activity.created_at), "dd/MM/yyyy HH:mm")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {activity.description && (
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Descrição</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{activity.description}</p></CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
            <DialogDescription>Atualize os dados da atividade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm((f: any) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{activityTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm((f: any) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low", "Normal", "High", "Urgent"].map(p => <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Assunto *</Label><Input value={form.title || ""} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description || ""} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Conta</Label>
                <Select value={form.account_id || "__none__"} onValueChange={v => setForm((f: any) => ({ ...f, account_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhuma</SelectItem>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Contato</Label>
                <Select value={form.contact_id || "__none__"} onValueChange={v => setForm((f: any) => ({ ...f, contact_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Oportunidade</Label>
                <Select value={form.opportunity_id || "__none__"} onValueChange={v => setForm((f: any) => ({ ...f, opportunity_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhuma</SelectItem>{opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Contrato</Label>
                <Select value={form.contract_id || "__none__"} onValueChange={v => setForm((f: any) => ({ ...f, contract_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{contracts.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Open", "Completed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={form.due_at || ""} onChange={e => setForm((f: any) => ({ ...f, due_at: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Atribuído a *</Label>
              <Select value={form.owner_user_id || "__none__"} onValueChange={v => setForm((f: any) => ({ ...f, owner_user_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent></Select>
            </div>
            <DialogFooter><Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
