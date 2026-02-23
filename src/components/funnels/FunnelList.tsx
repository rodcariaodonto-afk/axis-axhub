import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, GitBranch, Trash2, Edit, Play, Power } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FunnelList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: tenantId } = useQuery({
    queryKey: ["tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      return data?.tenant_id || "";
    },
    enabled: !!user,
  });

  const { data: funis = [], isLoading } = useQuery({
    queryKey: ["funis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funis")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant não encontrado");
      const { data, error } = await supabase
        .from("funis")
        .insert({ nome, descricao: descricao || null, tenant_id: tenantId, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["funis"] });
      setShowCreate(false);
      setNome("");
      setDescricao("");
      navigate(`/funis/${data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funis"] });
      toast.success("Funil excluído");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "ativo" ? "rascunho" : "ativo";
      const { error } = await supabase.from("funis").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["funis"] });
      toast.success(newStatus === "ativo" ? "Funil ativado!" : "Funil desativado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    rascunho: { label: "Rascunho", variant: "secondary" },
    ativo: { label: "Ativo", variant: "default" },
    pausado: { label: "Pausado", variant: "outline" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funis de Venda</h1>
          <p className="text-sm text-muted-foreground">Crie fluxos visuais de automação</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Funil
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : funis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg text-foreground">Nenhum funil criado</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro funil de venda</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Criar Funil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funis.map((f: any) => {
            const st = statusMap[f.status] || statusMap.rascunho;
            return (
              <Card key={f.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/funis/${f.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">{f.nome}</h3>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  {f.descricao && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{f.descricao}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={f.status === "ativo" ? "Desativar" : "Ativar"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatusMutation.mutate({ id: f.id, currentStatus: f.status });
                        }}
                      >
                        <Power className={`h-3.5 w-3.5 ${f.status === "ativo" ? "text-green-400" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(f.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Funil de Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Funil de Boas-Vindas" className="mt-1" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o objetivo deste funil" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!nome.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar e Editar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
