import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, List, CalendarDays, CheckCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, AlertTriangle, Phone, Mail, Users,
  CheckSquare, FileText, MessageCircle, CalendarCheck, Pencil, Power,
} from "lucide-react";
import { emitEvent } from "@/lib/emitEvent";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay,
  isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek,
  isToday, isBefore, startOfDay, endOfDay, isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const iconMap: Record<string, any> = {
  Phone, Mail, Users, CheckSquare, FileText, MessageCircle, CalendarCheck,
};

const priorityColors: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Normal: "bg-blue-500/20 text-blue-400",
  High: "bg-yellow-500/20 text-yellow-400",
  Urgent: "bg-destructive/20 text-destructive",
};
const priorityLabels: Record<string, string> = { Low: "Baixa", Normal: "Normal", High: "Alta", Urgent: "Urgente" };
const statusLabels: Record<string, string> = { Open: "Aberta", Completed: "Concluída", Cancelled: "Cancelada" };
const statusColors: Record<string, string> = {
  Open: "bg-blue-500/20 text-blue-400",
  Completed: "bg-green-500/20 text-green-400",
  Cancelled: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 15;

const defaultTypes = [
  { name: "Call", icon: "Phone", color: "#3B82F6" },
  { name: "Email", icon: "Mail", color: "#10B981" },
  { name: "Meeting", icon: "Users", color: "#8B5CF6" },
  { name: "Task", icon: "CheckSquare", color: "#F59E0B" },
  { name: "Note", icon: "FileText", color: "#6B7280" },
  { name: "WhatsApp", icon: "MessageCircle", color: "#25D366" },
];

export default function Activities() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [page, setPage] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");

  // Calendar
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Lookups
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "", title: "", description: "", account_id: "", contact_id: "",
    opportunity_id: "", contract_id: "", status: "Open", priority: "Normal",
    due_at: "", owner_user_id: "",
  });

  const ensureActivityTypes = useCallback(async () => {
    const { data } = await supabase.from("activity_types").select("*").eq("is_active", true);
    if (data && data.length > 0) { setActivityTypes(data); return; }
    // Create defaults
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const rows = defaultTypes.map(t => ({ tenant_id: profile.tenant_id, ...t }));
    await supabase.from("activity_types").insert(rows);
    const { data: created } = await supabase.from("activity_types").select("*").eq("is_active", true);
    setActivityTypes(created || []);
  }, []);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("activities")
      .select("*, contacts(first_name, last_name), deals(name), crm_accounts(name), opportunities(name), contracts(name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);

  const fetchLookups = useCallback(async () => {
    const [a, c, o, ct, p] = await Promise.all([
      supabase.from("crm_accounts").select("id, name").order("name"),
      supabase.from("contacts").select("id, first_name, last_name, account_id").order("first_name"),
      supabase.from("opportunities").select("id, name").eq("is_active", true).order("name"),
      supabase.from("contracts").select("id, name").eq("is_active", true).order("name"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setAccounts(a.data || []);
    setContacts(c.data || []);
    setOpportunities(o.data || []);
    setContracts(ct.data || []);
    setProfiles(p.data || []);
  }, []);

  useEffect(() => { ensureActivityTypes(); fetchItems(); fetchLookups(); }, [ensureActivityTypes, fetchItems, fetchLookups]);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter(a => {
      if (filterType !== "all" && a.type !== filterType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterPriority !== "all" && a.priority !== filterPriority) return false;
      if (filterOwner !== "all" && a.owner_user_id !== filterOwner) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!a.title?.toLowerCase().includes(s) && !a.description?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [items, filterType, filterStatus, filterPriority, filterOwner, searchTerm]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Summary
  const now = new Date();
  const startMonth = startOfMonth(now);
  const endMonth = endOfMonth(now);
  const startWeek = startOfWeek(now, { locale: ptBR });
  const endWeekDate = endOfWeek(now, { locale: ptBR });
  const summary = useMemo(() => {
    const open = items.filter(a => a.status === "Open" && a.is_active);
    const overdue = open.filter(a => a.due_at && isBefore(new Date(a.due_at), startOfDay(now)));
    const today = open.filter(a => a.due_at && isSameDay(new Date(a.due_at), now));
    const week = open.filter(a => a.due_at && isWithinInterval(new Date(a.due_at), { start: startWeek, end: endWeekDate }));
    const completedMonth = items.filter(a => a.status === "Completed" && a.done_at && isWithinInterval(new Date(a.done_at), { start: startMonth, end: endMonth }));
    return { open: open.length, overdue: overdue.length, today: today.length, week: week.length, completedMonth: completedMonth.length };
  }, [items]);

  const getTypeMeta = (type: string) => activityTypes.find(t => t.name === type) || { name: type, icon: "CalendarCheck", color: "#6B7280" };
  const getOwnerName = (uid: string | null) => { const p = profiles.find(x => x.id === uid); return p ? (p.full_name || p.email) : "—"; };

  const getDueDateColor = (due: string | null, status: string) => {
    if (!due || status !== "Open") return "";
    const d = new Date(due);
    if (isBefore(d, startOfDay(now))) return "text-destructive font-semibold";
    if (isSameDay(d, now)) return "text-yellow-500 font-semibold";
    return "";
  };

  const getRelatedLabel = (a: any) => {
    const parts: string[] = [];
    if (a.crm_accounts?.name) parts.push(a.crm_accounts.name);
    if (a.contacts) parts.push(`${a.contacts.first_name} ${a.contacts.last_name || ""}`.trim());
    if (a.opportunities?.name) parts.push(a.opportunities.name);
    if (a.contracts?.name) parts.push(a.contracts.name);
    if (a.deals?.name) parts.push(a.deals.name);
    return parts.join(", ") || "—";
  };

  // Modal open
  const openCreate = () => {
    setEditingId(null);
    setForm({
      type: activityTypes[0]?.name || "Task", title: "", description: "",
      account_id: "", contact_id: "", opportunity_id: "", contract_id: "",
      status: "Open", priority: "Normal", due_at: "", owner_user_id: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({
      type: a.type, title: a.title, description: a.description || "",
      account_id: a.account_id || "", contact_id: a.contact_id || "",
      opportunity_id: a.opportunity_id || "", contract_id: a.contract_id || "",
      status: a.status, priority: a.priority, due_at: a.due_at?.split("T")[0] || "",
      owner_user_id: a.owner_user_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: "Assunto obrigatório", variant: "destructive" }); return; }
    if (!form.owner_user_id) { toast({ title: "Atribuído a é obrigatório", variant: "destructive" }); return; }
    if (!form.account_id && !form.contact_id && !form.opportunity_id && !form.contract_id) {
      toast({ title: "Vincule a pelo menos 1 registro (Conta, Contato, Oportunidade ou Contrato)", variant: "destructive" }); return;
    }

    const payload: any = {
      title: form.title, type: form.type, description: form.description || null,
      account_id: form.account_id || null, contact_id: form.contact_id || null,
      opportunity_id: form.opportunity_id || null, contract_id: form.contract_id || null,
      status: form.status, priority: form.priority,
      due_at: form.due_at || null, owner_user_id: form.owner_user_id,
    };

    if (editingId) {
      // Handle status transitions
      const old = items.find(i => i.id === editingId);
      if (form.status === "Completed" && old?.status !== "Completed") payload.done_at = new Date().toISOString();
      if (form.status === "Open" && old?.status === "Completed") payload.done_at = null;

      const { error } = await supabase.from("activities").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Atividade atualizada!" });
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id, id").single();
      if (!profile) return;
      payload.tenant_id = profile.tenant_id;
      payload.created_by_id = profile.id;
      const { data: newAct, error } = await supabase.from("activities").insert(payload).select().single();
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Atividade criada!" });
      emitEvent("activity.created", { activity_id: newAct.id, type: form.type, title: form.title });
    }
    setDialogOpen(false);
    fetchItems();
  };

  const handleComplete = async (id: string) => {
    await supabase.from("activities").update({ status: "Completed", done_at: new Date().toISOString() }).eq("id", id);
    emitEvent("activity.completed", { activity_id: id });
    toast({ title: "Atividade concluída!" });
    fetchItems();
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from("activities").update({ is_active: false }).eq("id", id);
    toast({ title: "Atividade desativada" });
    fetchItems();
  };

  // Calendar
  const calDays = useMemo(() => {
    const mStart = startOfMonth(calMonth);
    const mEnd = endOfMonth(calMonth);
    const wStart = startOfWeek(mStart, { locale: ptBR });
    const wEnd = endOfWeek(mEnd, { locale: ptBR });
    return eachDayOfInterval({ start: wStart, end: wEnd });
  }, [calMonth]);

  const dayActivities = (day: Date) => filtered.filter(a => a.due_at && isSameDay(new Date(a.due_at), day));

  const TypeIcon = ({ type }: { type: string }) => {
    const meta = getTypeMeta(type);
    const Icon = iconMap[meta.icon] || CalendarCheck;
    return <Icon className="h-4 w-4" style={{ color: meta.color }} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas e compromissos</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4 mr-1" />Lista</Button>
          <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")}><CalendarDays className="h-4 w-4 mr-1" />Agenda</Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Atividade</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Abertas", value: summary.open, icon: Clock, color: "text-blue-400" },
          { label: "Vencidas", value: summary.overdue, icon: AlertTriangle, color: "text-destructive" },
          { label: "Hoje", value: summary.today, icon: CalendarCheck, color: "text-yellow-400" },
          { label: "Esta Semana", value: summary.week, icon: CalendarDays, color: "text-primary" },
          { label: "Concluídas (Mês)", value: summary.completedMonth, icon: CheckCircle, color: "text-green-400" },
        ].map(c => (
          <Card key={c.label} className="border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {activityTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {["Open", "Completed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Prioridades</SelectItem>
            {["Low", "Normal", "High", "Urgent"].map(p => <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterOwner} onValueChange={v => { setFilterOwner(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Atribuído a" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List View */}
      {view === "list" && (
        <>
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Relacionado a</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Atribuído a</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : paged.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma atividade</TableCell></TableRow>
                  ) : paged.map(a => (
                    <TableRow key={a.id} className="border-border">
                      <TableCell><div className="flex items-center gap-2"><TypeIcon type={a.type} /><span className="text-sm">{getTypeMeta(a.type).name}</span></div></TableCell>
                      <TableCell>
                        <button onClick={() => navigate(`/activities/${a.id}`)} className="font-medium text-primary hover:underline">{a.title}</button>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{getRelatedLabel(a)}</TableCell>
                      <TableCell><Badge className={statusColors[a.status] || ""}>{statusLabels[a.status] || a.status}</Badge></TableCell>
                      <TableCell><Badge className={priorityColors[a.priority] || ""}>{priorityLabels[a.priority] || a.priority}</Badge></TableCell>
                      <TableCell className={getDueDateColor(a.due_at, a.status)}>
                        {a.due_at ? format(new Date(a.due_at), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getOwnerName(a.owner_user_id)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {a.status === "Open" && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleComplete(a.id)}><CheckCircle className="h-3.5 w-3.5 text-green-500" /></Button>}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeactivate(a.id)}><Power className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground self-center">Página {page + 1} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </>
      )}

      {/* Calendar View */}
      {view === "calendar" && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCalMonth(m => subMonths(m, 1))}><ChevronLeft className="h-5 w-5" /></Button>
              <h3 className="text-lg font-semibold capitalize">{format(calMonth, "MMMM yyyy", { locale: ptBR })}</h3>
              <Button variant="ghost" size="icon" onClick={() => setCalMonth(m => addMonths(m, 1))}><ChevronRight className="h-5 w-5" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-px">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {calDays.map(day => {
                const acts = dayActivities(day);
                const inMonth = isSameMonth(day, calMonth);
                const today = isToday(day);
                const selected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSameDay(day, selectedDay || new Date(0)) ? null : day)}
                    className={`min-h-[80px] p-1 border border-border rounded text-left transition-colors
                      ${!inMonth ? "opacity-30" : ""} ${today ? "bg-primary/10" : ""}
                      ${selected ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
                  >
                    <span className={`text-xs font-medium ${today ? "text-primary" : ""}`}>{format(day, "d")}</span>
                    <div className="space-y-0.5 mt-1">
                      {acts.slice(0, 3).map(a => {
                        const meta = getTypeMeta(a.type);
                        const overdue = a.status === "Open" && a.due_at && isBefore(new Date(a.due_at), startOfDay(now));
                        return (
                          <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${overdue ? "bg-destructive/20 text-destructive" : ""}`}
                            style={!overdue ? { backgroundColor: meta.color + "20", color: meta.color } : {}}>
                            {a.title}
                          </div>
                        );
                      })}
                      {acts.length > 3 && <div className="text-[10px] text-muted-foreground">+{acts.length - 3} mais</div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected day detail */}
            {selectedDay && (
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="font-semibold mb-2">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</h4>
                {dayActivities(selectedDay).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade neste dia</p>
                ) : (
                  <div className="space-y-2">
                    {dayActivities(selectedDay).map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-2 rounded border border-border hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/activities/${a.id}`)}>
                        <TypeIcon type={a.type} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{getRelatedLabel(a)}</p>
                        </div>
                        <Badge className={statusColors[a.status]}>{statusLabels[a.status]}</Badge>
                        <Badge className={priorityColors[a.priority]}>{priorityLabels[a.priority]}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
            <DialogDescription>Preencha os dados da atividade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{activityTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low", "Normal", "High", "Urgent"].map(p => <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assunto *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={form.account_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, account_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Select value={form.contact_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, contact_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Oportunidade</Label>
                <Select value={form.opportunity_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, opportunity_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contrato</Label>
                <Select value={form.contract_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, contract_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {contracts.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{editingId ? "Status" : "Status"}</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Open", "Completed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Atribuído a *</Label>
              <Select value={form.owner_user_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, owner_user_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">{editingId ? "Salvar" : "Criar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
