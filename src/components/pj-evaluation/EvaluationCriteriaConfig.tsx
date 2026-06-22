import { useState, useEffect } from "react";
import { z } from "zod";
import { Plus, Pencil, Trash2, Sparkles, GripVertical, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  usePJEvaluationCriteria, useSaveCriteria, useDeleteCriteria, useCreateDefaultCriteria,
  type PJEvaluationCriteria, type SaveCriteriaInput,
} from "@/hooks/usePJEvaluationCriteria";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:        z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  weight:      z.coerce.number().int().min(1, "Mínimo 1").max(10, "Máximo 10"),
  is_active:   z.boolean(),
});

type FormValues = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = { name: "", description: "", weight: 5, is_active: true };

// ─── Weight pill ──────────────────────────────────────────────────────────────

function WeightPill({ weight }: { weight: number }) {
  const color =
    weight >= 8 ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
    : weight >= 5 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
    : "bg-muted/60 text-muted-foreground border-muted-foreground/20";
  return (
    <Badge variant="outline" className={`text-xs tabular-nums ${color}`}>
      peso {weight}
    </Badge>
  );
}

// ─── Form dialog ──────────────────────────────────────────────────────────────

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: PJEvaluationCriteria | null;
}

function CriteriaFormDialog({ open, onClose, editing }: FormDialogProps) {
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const save = useSaveCriteria();

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        weight: editing.weight,
        is_active: editing.is_active,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [editing, open]);

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.errors.forEach((err) => {
        const k = err.path[0] as keyof FormValues;
        if (!errs[k]) errs[k] = err.message;
      });
      setErrors(errs);
      return;
    }
    try {
      await save.mutateAsync({ ...result.data, id: editing?.id } as SaveCriteriaInput);
      toast.success(editing ? "Critério atualizado" : "Critério criado");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar critério");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar critério" : "Novo critério de avaliação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Pontualidade"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Descreva o que este critério avalia..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Peso <span className="text-destructive">*</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">(1–10 — maior = mais importante)</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={10}
                value={form.weight}
                onChange={(e) => set("weight", Number(e.target.value) as any)}
                className={`w-24 ${errors.weight ? "border-destructive" : ""}`}
              />
              <WeightPill weight={form.weight} />
            </div>
            {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
            <Label htmlFor="is_active" className="cursor-pointer">Critério ativo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EvaluationCriteriaConfig() {
  const { data: criteria = [], isLoading } = usePJEvaluationCriteria();
  const deleteMutation = useDeleteCriteria();
  const createDefaults = useCreateDefaultCriteria();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PJEvaluationCriteria | null>(null);
  const [deleting, setDeleting] = useState<PJEvaluationCriteria | null>(null);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(c: PJEvaluationCriteria) { setEditing(c); setFormOpen(true); }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Critério removido");
      setDeleting(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    }
  }

  async function handleCreateDefaults() {
    try {
      await createDefaults.mutateAsync();
      toast.success("Critérios padrão criados com sucesso");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar critérios padrão");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "..." : `${criteria.length} critério${criteria.length !== 1 ? "s" : ""} cadastrado${criteria.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          {criteria.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCreateDefaults}
              disabled={createDefaults.isPending}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {createDefaults.isPending ? "Criando..." : "Criar critérios padrão"}
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Novo critério
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : criteria.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center flex flex-col items-center gap-3">
          <GripVertical className="h-8 w-8 opacity-30 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Nenhum critério cadastrado.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie critérios personalizados ou use os padrões sugeridos.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">Critério</th>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium">Peso</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {criteria.map((c) => (
                <tr key={c.id} className={`transition-colors ${c.is_active ? "hover:bg-muted/20" : "opacity-50 hover:bg-muted/20"}`}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                    {c.description ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <WeightPill weight={c.weight} />
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(c)}
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CriteriaFormDialog open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover critério?</AlertDialogTitle>
            <AlertDialogDescription>
              O critério <strong>{deleting?.name}</strong> será removido. Avaliações existentes que usam este critério serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
