import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Trash2, Copy, CheckCircle2, Webhook, AlertTriangle,
  ToggleLeft, ToggleRight, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  PJ_EVENTS, PJEvent, WebhookRow,
  useWebhooks, useCreateWebhook, useToggleWebhook, useDeleteWebhook,
} from "@/hooks/useWebhookConfig";
import { useQueryClient } from "@tanstack/react-query";

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yy HH:mm", { locale: ptBR }); } catch { return d; }
}

function SecretReveal({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast({ title: "Secret copiado!" });
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
          Copie o secret agora — não será exibido novamente.
        </p>
        <p className="text-xs text-muted-foreground">
          Use como chave para validar a assinatura HMAC SHA256 em <code>X-Webhook-Signature</code>.
        </p>
      </div>
      <div className="flex gap-2">
        <Input value={secret} readOnly className="font-mono text-xs bg-muted" />
        <Button variant={copied ? "default" : "outline"} size="icon" onClick={copy} className="shrink-0">
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateWebhook();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<PJEvent[]>(["nf.approved", "nf.rejected"]);
  const [created, setCreated] = useState<WebhookRow | null>(null);

  function toggle(ev: PJEvent) {
    setEvents((p) => p.includes(ev) ? p.filter((e) => e !== ev) : [...p, ev]);
  }

  async function handleCreate() {
    if (!url.trim() || events.length === 0) return;
    try {
      const row = await create.mutateAsync({ webhook_url: url.trim(), events });
      setCreated(row);
    } catch { /* handled in hook */ }
  }

  function handleClose() {
    setUrl("");
    setEvents(["nf.approved", "nf.rejected"]);
    setCreated(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            {created ? "Webhook Criado" : "Novo Webhook"}
          </DialogTitle>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <SecretReveal secret={created.webhook_secret} />
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium">URL:</span> {created.webhook_url}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>URL de destino</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://seu-sistema.com/webhook"
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label>Eventos</Label>
              <div className="space-y-2">
                {PJ_EVENTS.map((ev) => (
                  <label
                    key={ev.value}
                    className="flex items-start gap-2.5 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={events.includes(ev.value)}
                      onCheckedChange={() => toggle(ev.value)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{ev.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {events.length === 0 && (
                <p className="text-xs text-destructive">Selecione pelo menos um evento</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={!url.trim() || events.length === 0 || create.isPending}
              >
                {create.isPending ? "Criando..." : "Criar Webhook"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function WebhookConfig() {
  const { data: webhooks = [], isLoading } = useWebhooks();
  const toggle = useToggleWebhook();
  const del = useDeleteWebhook();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WebhookRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Receba notificações automáticas nos eventos do fluxo PJ.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => qc.invalidateQueries({ queryKey: ["webhooks-pj"] })}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Webhook
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Carregando...
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <Webhook className="h-8 w-8 opacity-30 mx-auto mb-3" />
          <p className="text-sm">Nenhum webhook configurado.</p>
          <p className="text-xs mt-1">Crie um webhook para integrar com sistemas externos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`rounded-lg border border-border bg-card p-4 ${!wh.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono text-foreground truncate max-w-xs">
                      {wh.webhook_url}
                    </code>
                    {wh.is_active ? (
                      <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-600 dark:text-green-400 shrink-0">Ativo</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] shrink-0">Inativo</Badge>
                    )}
                    {wh.failed_attempts > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="h-3 w-3" />
                        {wh.failed_attempts} falha{wh.failed_attempts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {(wh.events ?? []).map((ev) => {
                      const meta = PJ_EVENTS.find((e) => e.value === ev);
                      return (
                        <span key={ev} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                          {meta?.label ?? ev}
                        </span>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Criado em {fmtDate(wh.created_at)}
                    {wh.last_triggered_at ? ` · Último disparo: ${fmtDate(wh.last_triggered_at)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title={wh.is_active ? "Desativar" : "Ativar"}
                    onClick={() => toggle.mutate({ id: wh.id, is_active: !wh.is_active })}
                  >
                    {wh.is_active
                      ? <ToggleRight className="h-4 w-4 text-green-600" />
                      : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Excluir"
                    onClick={() => setConfirmDelete(wh)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              O webhook para <strong className="font-mono text-xs">{confirmDelete?.webhook_url}</strong> e
              todos os seus logs serão removidos permanentemente.
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
