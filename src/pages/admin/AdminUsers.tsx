import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Users as UsersIcon, KeyRound, UserCog, MoreHorizontal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string | null;
  tenant_id: string | null;
  created_at: string;
  tenants: { id: string; name: string } | null;
};

type RoleRow = { user_id: string; role: string };

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return "-"; }
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{ type: "reset" | "impersonate"; userId: string; email: string; name: string } | null>(null);
  const [impersonateResult, setImpersonateResult] = useState<{ link: string; email: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users-global"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name, status, tenant_id, created_at, tenants(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-user-roles-global"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("super-admin-reset-user-password", { body: { user_id } });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? "Erro");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Link de recuperacao enviado", description: `E-mail enviado para ${data?.target_email}` });
      setConfirmAction(null);
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const impersonateMutation = useMutation({
    mutationFn: async ({ user_id, reason }: { user_id: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("super-admin-impersonate", { body: { user_id, reason } });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? "Erro");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Magic link gerado", description: "Abra em aba anonima. Acao registrada em audit_logs." });
      setImpersonateResult({ link: data.magic_link, email: data.target_email });
      setConfirmAction(null);
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const rolesByUser = new Map<string, string[]>();
  (roles ?? []).forEach((r) => {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  });

  const tenantsList = Array.from(new Map((profiles ?? []).filter(p => p.tenants).map(p => [p.tenants!.id, p.tenants!])).values()).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = (profiles ?? []).filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      if (!(p.full_name ?? "").toLowerCase().includes(s) && !(p.email ?? "").toLowerCase().includes(s)) return false;
    }
    if (tenantFilter !== "all" && p.tenant_id !== tenantFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Usuarios (cross-tenant)</h2>
        <p className="text-xs text-muted-foreground">{profiles ? `${filtered.length} de ${profiles.length} usuarios` : "Carregando..."}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Tenant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tenants</SelectItem>
            {tenantsList.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <UsersIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
              Nenhum usuario.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right w-12">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userRoles = rolesByUser.get(p.id) ?? [];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name ?? "-"}</TableCell>
                      <TableCell className="text-sm">{p.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.tenants?.name ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length === 0 ? <span className="text-xs text-muted-foreground">-</span> :
                            userRoles.map(r => <Badge key={r} variant="outline" className="text-xs capitalize">{r}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize">{p.status ?? "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "reset", userId: p.id, email: p.email, name: p.full_name ?? p.email })} className="cursor-pointer">
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "impersonate", userId: p.id, email: p.email, name: p.full_name ?? p.email })} className="cursor-pointer text-orange-500 focus:text-orange-500">
                              <UserCog className="h-4 w-4 mr-2" />
                              Impersonar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "reset" ? "Enviar reset de senha?" : "Impersonar usuario?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "reset"
                ? <>Sera enviado um e-mail de recuperacao para <strong>{confirmAction?.email}</strong>. Acao registrada em audit_logs.</>
                : <>Sera gerado um magic link para <strong>{confirmAction?.email}</strong>. Abra em aba anonima para preservar sua sessao de super admin. Todas as acoes na sessao impersonada sao auditadas com seu actor_user_id.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!confirmAction) return;
                if (confirmAction.type === "reset") resetMutation.mutate(confirmAction.userId);
                else impersonateMutation.mutate({ user_id: confirmAction.userId, reason: "Suporte via super admin" });
              }}
              disabled={resetMutation.isPending || impersonateMutation.isPending}
            >
              {(resetMutation.isPending || impersonateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!impersonateResult} onOpenChange={(o) => { if (!o) setImpersonateResult(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Magic link gerado</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Link para impersonar <strong>{impersonateResult?.email}</strong>:</span>
              <textarea readOnly value={impersonateResult?.link ?? ""} className="w-full h-32 text-xs font-mono p-2 bg-muted rounded border border-border" onFocus={(e) => e.target.select()} />
              <span className="block text-orange-500 text-xs">
                Copie e abra em <strong>aba anonima</strong> (Cmd+Shift+N) para nao deslogar sua conta atual de super admin.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { navigator.clipboard.writeText(impersonateResult?.link ?? ""); toast({ title: "Link copiado" }); }}>Copiar link</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
