import { useState } from "react";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, ShieldOff, Trash2, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApiKeys, useRevokeApiKey, useDeleteApiKey, ApiKeyRow } from "@/hooks/useApiKeys";
import { ApiKeyCreateDialog } from "./ApiKeyCreateDialog";

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return d; }
}

function KeyStatus({ row }: { row: ApiKeyRow }) {
  if (!row.is_active)
    return <Badge variant="destructive" className="text-[10px]">Revogada</Badge>;
  if (row.expires_at && isPast(parseISO(row.expires_at)))
    return <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Expirada</Badge>;
  return <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400">Ativa</Badge>;
}

const SCOPE_COLORS: Record<string, string> = {
  "pj:read":        "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "pj:write":       "bg-blue-500/30 text-blue-700 dark:text-blue-300",
  "nf:read":        "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "nf:write":       "bg-purple-500/30 text-purple-700 dark:text-purple-300",
  "contracts:read": "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  "documents:read": "bg-teal-500/15 text-teal-600 dark:text-teal-400",
};

export function ApiKeyManager() {
  const { data: keys = [], isLoading } = useApiKeys();
  const revoke = useRevokeApiKey();
  const del = useDeleteApiKey();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKeyRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiKeyRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Gerencie as chaves de acesso à API REST do AXIS.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Chave
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Nome</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead>Escopos</TableHead>
              <TableHead className="text-center">Rate Limit</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Carregando...
                  </div>
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhuma chave cadastrada. Crie a primeira chave para integrar sistemas externos.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.id} className={!k.is_active ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>
                    <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {k.api_key_masked}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : k.scopes.map((s) => (
                        <span
                          key={s}
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SCOPE_COLORS[s] ?? "bg-muted text-foreground"}`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="flex items-center justify-center gap-1">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      {k.rate_limit}/min
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <KeyStatus row={k} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtDate(k.last_used_at)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.expires_at ? fmtDate(k.expires_at).split(" ")[0] : "Nunca"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {k.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Revogar"
                          onClick={() => setConfirmRevoke(k)}
                        >
                          <ShieldOff className="h-3.5 w-3.5 text-yellow-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Excluir"
                        onClick={() => setConfirmDelete(k)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ApiKeyCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Revoke confirm */}
      <AlertDialog open={!!confirmRevoke} onOpenChange={() => setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar chave?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave "<strong>{confirmRevoke?.name}</strong>" será desativada imediatamente.
              Integrações que a usam deixarão de funcionar. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={() => { revoke.mutate(confirmRevoke!.id); setConfirmRevoke(null); }}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chave?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave "<strong>{confirmDelete?.name}</strong>" e todos os seus logs serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => { del.mutate(confirmDelete!.id); setConfirmDelete(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
