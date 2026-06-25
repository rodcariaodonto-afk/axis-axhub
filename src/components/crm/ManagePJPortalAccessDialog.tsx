import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { InvitePJPortalDialog } from "./InvitePJPortalDialog";
import { UserPlus, Trash2, ShieldCheck, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccessEntry {
  id: string;
  user_id: string;
  access_level: string;
  created_at: string;
  last_login: string | null;
  user_email: string;
  user_name: string | null;
}

const ACCESS_LEVEL_OPTIONS = [
  { value: "view", label: "Visualização" },
  { value: "edit", label: "Edição" },
  { value: "admin", label: "Acesso Total" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pjId: string;
  pjName: string;
}

export function ManagePJPortalAccessDialog({ open, onOpenChange, pjId, pjName }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ["pj-portal-access-list", pjId],
    enabled: open,
    staleTime: 0,
    queryFn: async () => {
      const { data: accesses, error } = await (supabase as any)
        .from("pj_portal_access")
        .select("id, user_id, access_level, created_at, last_login")
        .eq("pj_id", pjId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!(accesses as any[])?.length) return [] as AccessEntry[];

      const userIds = (accesses as any[]).map((a) => a.user_id as string);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (accesses as any[]).map((a) => ({
        id: a.id as string,
        user_id: a.user_id as string,
        access_level: a.access_level as string,
        created_at: a.created_at as string,
        last_login: a.last_login as string | null,
        user_email: profileMap.get(a.user_id as string)?.email ?? "—",
        user_name: profileMap.get(a.user_id as string)?.full_name ?? null,
      })) as AccessEntry[];
    },
  });

  const updateLevel = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: string }) => {
      const { error } = await (supabase as any)
        .from("pj_portal_access")
        .update({ access_level: level })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Nível de acesso atualizado" });
      qc.invalidateQueries({ queryKey: ["pj-portal-access-list", pjId] });
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pj_portal_access")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Acesso revogado" });
      qc.invalidateQueries({ queryKey: ["pj-portal-access-list", pjId] });
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleInviteClose = (v: boolean) => {
    setInviteOpen(v);
    if (!v) qc.invalidateQueries({ queryKey: ["pj-portal-access-list", pjId] });
  };

  return (
    <>
      <Dialog open={open && !inviteOpen} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Portal PJ — {pjName}
            </DialogTitle>
            <DialogDescription>
              Gerencie quem tem acesso ao Portal do Prestador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : accessList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum acesso configurado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {accessList.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde{" "}
                        {format(new Date(entry.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        {entry.last_login &&
                          ` · Último acesso ${format(new Date(entry.last_login), "dd/MM/yyyy", { locale: ptBR })}`}
                      </p>
                    </div>
                    <Select
                      value={entry.access_level}
                      onValueChange={(v) => updateLevel.mutate({ id: entry.id, level: v })}
                      disabled={updateLevel.isPending}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCESS_LEVEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      title="Revogar acesso"
                      onClick={() => revoke.mutate(entry.id)}
                      disabled={revoke.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {accessList.length} acesso{accessList.length !== 1 ? "s" : ""} configurado
                {accessList.length !== 1 ? "s" : ""}
              </p>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar acesso
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {inviteOpen && (
        <InvitePJPortalDialog
          open={inviteOpen}
          onOpenChange={handleInviteClose}
          pjId={pjId}
          pjName={pjName}
        />
      )}
    </>
  );
}
