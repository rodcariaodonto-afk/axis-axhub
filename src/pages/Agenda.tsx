import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Loader2, Link2, Unlink } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface EventForm {
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  start_date: string;
  end_date: string;
}

const emptyForm: EventForm = {
  title: "",
  description: "",
  location: "",
  start_at: "",
  end_at: "",
  all_day: false,
  start_date: "",
  end_date: "",
};

const PUBLISHED_URL = "https://axis-axhub.lovable.app/agenda";

function isPreviewEnvironment() {
  const host = window.location.hostname;
  return host.includes("lovableproject.com") || host.includes("lovable.app") && host !== "axis-axhub.lovable.app";
}

export default function Agenda() {
  const { user } = useAuth();
  const isPreview = isPreviewEnvironment();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const invokeSync = useCallback(async (action: string, params: Record<string, string> = {}, options: { method?: string; body?: object } = {}) => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error("Not authenticated");

    const qs = new URLSearchParams({ action, ...params }).toString();
    const url = `https://${projectId}.supabase.co/functions/v1/google-calendar-sync?${qs}`;

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }, [projectId]);

  const checkConnection = useCallback(async () => {
    try {
      await invokeSync("status");
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [invokeSync]);

  const fetchEvents = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const timeMin = startOfMonth(currentMonth).toISOString();
      const timeMax = endOfMonth(currentMonth).toISOString();
      const data = await invokeSync("list", { timeMin, timeMax });
      setEvents(data.items || []);
    } catch (err: any) {
      toast({ title: "Erro ao carregar eventos", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [connected, currentMonth, invokeSync]);

  useEffect(() => { checkConnection(); }, [checkConnection]);
  useEffect(() => { if (connected) fetchEvents(); }, [connected, fetchEvents]);

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const redirectUri = `${window.location.origin}/agenda`;
      const qs = new URLSearchParams({ action: "authorize", redirect_uri: redirectUri }).toString();
      const url = `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?${qs}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" });
    } finally {
      setConnectingGoogle(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) return;

    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return;

        const url = `https://${projectId}.supabase.co/functions/v1/google-calendar-auth?action=callback`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ code, state, redirect_uri: `${window.location.origin}/agenda` }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast({ title: "Google Calendar conectado!" });
        window.history.replaceState({}, "", "/agenda");
        setConnected(true);
      } catch (err: any) {
        toast({ title: "Erro no callback", description: err.message, variant: "destructive" });
      }
    })();
  }, [projectId]);

  const handleDisconnect = async () => {
    const { error } = await supabase.from("google_calendar_tokens").delete().eq("user_id", user?.id || "");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setConnected(false);
      setEvents([]);
      toast({ title: "Google Calendar desconectado" });
    }
  };

  const openCreate = (date?: Date) => {
    const d = date || selectedDate;
    const start = new Date(d);
    start.setHours(9, 0, 0);
    const end = new Date(d);
    end.setHours(10, 0, 0);

    setEditingEvent(null);
    setForm({
      ...emptyForm,
      start_at: format(start, "yyyy-MM-dd'T'HH:mm"),
      end_at: format(end, "yyyy-MM-dd'T'HH:mm"),
      start_date: format(d, "yyyy-MM-dd"),
      end_date: format(addDays(d, 1), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    const isAllDay = !!ev.start.date;
    setEditingEvent(ev);
    setForm({
      title: ev.summary || "",
      description: ev.description || "",
      location: ev.location || "",
      all_day: isAllDay,
      start_at: ev.start.dateTime ? format(parseISO(ev.start.dateTime), "yyyy-MM-dd'T'HH:mm") : "",
      end_at: ev.end.dateTime ? format(parseISO(ev.end.dateTime), "yyyy-MM-dd'T'HH:mm") : "",
      start_date: ev.start.date || "",
      end_date: ev.end.date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        location: form.location,
        all_day: form.all_day,
      };
      if (form.all_day) {
        payload.start_date = form.start_date;
        payload.end_date = form.end_date;
      } else {
        payload.start_at = new Date(form.start_at).toISOString();
        payload.end_at = new Date(form.end_at).toISOString();
      }

      if (editingEvent) {
        await invokeSync("update", { eventId: editingEvent.id }, { method: "PUT", body: payload });
        toast({ title: "Evento atualizado!" });
      } else {
        await invokeSync("create", {}, { method: "POST", body: payload });
        toast({ title: "Evento criado!" });
      }
      setDialogOpen(false);
      fetchEvents();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/google-calendar-sync?action=delete&eventId=${eventId}`;
      const session = (await supabase.auth.getSession()).data.session;
      await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${session!.access_token}` } });
      toast({ title: "Evento excluído!" });
      fetchEvents();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getEventsForDay = (date: Date) =>
    events.filter((ev) => {
      const evDate = ev.start.dateTime ? parseISO(ev.start.dateTime) : ev.start.date ? parseISO(ev.start.date) : null;
      return evDate && isSameDay(evDate, date);
    });

  const selectedDayEvents = getEventsForDay(selectedDate);

  if (connected === null) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <CalendarDays className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Conecte seu Google Calendar</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Para visualizar e gerenciar sua agenda, conecte sua conta Google. Seus eventos serão sincronizados automaticamente.
        </p>
        <Button onClick={handleConnectGoogle} disabled={connectingGoogle} size="lg">
          {connectingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
          Conectar Google Calendar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            <Unlink className="mr-2 h-4 w-4" /> Desconectar
          </Button>
          <Button onClick={() => openCreate()} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Novo Evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar grid */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <CardTitle className="text-lg capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-px mb-1">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {days.map((day, i) => {
                    const dayEvents = getEventsForDay(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        onDoubleClick={() => openCreate(day)}
                        className={`min-h-[70px] p-1 text-left border rounded-md transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        } ${!isCurrentMonth ? "opacity-40" : ""}`}
                      >
                        <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday ? "bg-primary text-primary-foreground" : ""
                        }`}>
                          {format(day, "d")}
                        </span>
                        <div className="space-y-0.5 mt-0.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div key={ev.id} className="text-[10px] leading-tight truncate bg-primary/10 text-primary rounded px-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); openEdit(ev); }}>
                              {ev.summary}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} mais</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Day detail */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm capitalize">{format(selectedDate, "EEEE, dd MMM", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento</p>
            ) : (
              selectedDayEvents.map((ev) => {
                const time = ev.start.dateTime ? format(parseISO(ev.start.dateTime), "HH:mm") : "Dia todo";
                return (
                  <div key={ev.id} className="p-2 border rounded-md space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{ev.summary}</p>
                        <p className="text-xs text-muted-foreground">{time}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(ev)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(ev.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
                    {ev.location && <p className="text-xs text-muted-foreground">📍 {ev.location}</p>}
                  </div>
                );
              })
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => openCreate()}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Event dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.all_day} onCheckedChange={(v) => setForm({ ...form, all_day: v })} />
              <Label>Dia inteiro</Label>
            </div>
            {form.all_day ? (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Data início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Data fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
                <div><Label>Fim</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
              </div>
            )}
            <div><Label>Local</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEvent ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
