import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { DashboardFilters } from "./DashboardFilters";
import { DashboardGrid } from "./DashboardGrid";
import { WidgetConfigModal } from "./WidgetConfigModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function BIDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tenant_id from profiles
  const { data: profile } = useQuery({
    queryKey: ["bi-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  const tenantId = profile?.tenant_id ?? null;
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [newDashOpen, setNewDashOpen] = useState(false);
  const [newDashName, setNewDashName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch dashboards
  const { data: dashboards = [], isLoading: loadingDash } = useQuery({
    queryKey: ["bi-dashboards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bi_dashboards")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Auto-select first dashboard
  const activeDashId = selectedDashboardId || dashboards[0]?.id || null;

  // Fetch widgets for active dashboard
  const { data: widgets = [] } = useQuery({
    queryKey: ["bi-widgets", activeDashId],
    queryFn: async () => {
      if (!activeDashId) return [];
      const { data, error } = await supabase
        .from("bi_widgets")
        .select("*")
        .eq("dashboard_id", activeDashId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!activeDashId,
  });

  // Create dashboard
  const createDash = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("bi_dashboards")
        .insert({ name, tenant_id: tenantId!, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bi-dashboards"] });
      setSelectedDashboardId(data.id);
      setNewDashOpen(false);
      setNewDashName("");
      toast.success("Dashboard criado!");
    },
    onError: () => toast.error("Erro ao criar dashboard"),
  });

  // Add widget
  const addWidget = useMutation({
    mutationFn: async (config: { title: string; chart_type: string; metric: string; dimension: string; aggregation: string }) => {
      const { error } = await supabase.from("bi_widgets").insert({
        tenant_id: tenantId!,
        dashboard_id: activeDashId!,
        ...config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bi-widgets", activeDashId] });
      toast.success("Widget adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar widget"),
  });

  // Delete widget
  const deleteWidget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bi_widgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bi-widgets", activeDashId] });
      toast.success("Widget removido");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Business Intelligence</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dashboards.length > 0 && (
            <Select value={activeDashId || ""} onValueChange={setSelectedDashboardId}>
              <SelectTrigger className="w-52 h-9">
                <SelectValue placeholder="Selecione um dashboard" />
              </SelectTrigger>
              <SelectContent>
                {dashboards.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setNewDashOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Dashboard
          </Button>
          {activeDashId && (
            <>
              <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Settings className="h-4 w-4 mr-1" /> {isEditing ? "Concluir" : "Editar"}
              </Button>
              {isEditing && (
                <Button size="sm" onClick={() => setWidgetModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Widget
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {activeDashId && <DashboardFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />}

      {loadingDash ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : !activeDashId ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Crie seu primeiro dashboard para começar.</p>
          <Button onClick={() => setNewDashOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Dashboard</Button>
        </div>
      ) : (
        <DashboardGrid
          widgets={widgets}
          dateFrom={dateFrom || undefined}
          dateTo={dateTo || undefined}
          isEditing={isEditing}
          onDeleteWidget={(id) => deleteWidget.mutate(id)}
        />
      )}

      <WidgetConfigModal open={widgetModalOpen} onClose={() => setWidgetModalOpen(false)} onSave={(c) => addWidget.mutate(c)} />

      {/* New Dashboard Dialog */}
      <Dialog open={newDashOpen} onOpenChange={setNewDashOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Novo Dashboard</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={newDashName} onChange={(e) => setNewDashName(e.target.value)} placeholder="Ex: Dashboard Vendas" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDashOpen(false)}>Cancelar</Button>
            <Button onClick={() => createDash.mutate(newDashName)} disabled={!newDashName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
