import { useState } from "react";
import { z } from "zod";
import { Plus, Pencil, Trash2, FileText, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  usePJDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDeleteDocumentType,
  type PJDocumentType,
} from "@/hooks/usePJDocumentTypes";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  is_mandatory: z.boolean(),
  validity_days: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive("Deve ser positivo").nullable().optional()
  ),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { name: "", description: "", is_mandatory: false, validity_days: null };

interface Props {
  editing: PJDocumentType | null;
  open: boolean;
  onClose: () => void;
}

function TypeFormDialog({ editing, open, onClose }: Props) {
  const { toast } = useToast();
  const create = useCreateDocumentType();
  const update = useUpdateDocumentType();

  const [values, setValues] = useState<FormValues>(
    editing
      ? {
          name: editing.name,
          description: editing.description ?? "",
          is_mandatory: editing.is_mandatory,
          validity_days: editing.validity_days ?? null,
        }
      : EMPTY
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  // Reset on open
  useState(() => {
    setValues(
      editing
        ? { name: editing.name, description: editing.description ?? "", is_mandatory: editing.is_mandatory, validity_days: editing.validity_days ?? null }
        : EMPTY
    );
    setErrors({});
  });

  async function handleSubmit() {
    const result = schema.safeParse(values);
    if (!result.success) {
      const errs: typeof errors = {};
      result.error.errors.forEach((e) => {
        const k = e.path[0] as keyof FormValues;
        errs[k] = e.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...result.data });
        toast({ title: "Tipo atualizado com sucesso" });
      } else {
        await create.mutateAsync(result.data);
        toast({ title: "Tipo criado com sucesso" });
      }
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Tipo" : "Novo Tipo de Documento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Ex: Contrato Social, RG/CNH..."
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={values.description ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Validade (dias)</Label>
            <Input
              type="number"
              min={1}
              value={values.validity_days ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, validity_days: e.target.value === "" ? null : Number(e.target.value) }))}
              placeholder="Deixe em branco se não tem validade"
            />
            {errors.validity_days && <p className="text-xs text-destructive">{errors.validity_days}</p>}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Obrigatório</p>
              <p className="text-xs text-muted-foreground">PJ deve enviar este documento</p>
            </div>
            <Switch
              checked={values.is_mandatory}
              onCheckedChange={(v) => setValues((prev) => ({ ...prev, is_mandatory: v }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? "Salvando..." : editing ? "Salvar alterações" : "Criar tipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentTypeConfig() {
  const { data: types = [], isLoading } = usePJDocumentTypes();
  const deleteType = useDeleteDocumentType();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PJDocumentType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(t: PJDocumentType) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteType.mutateAsync(id);
      toast({ title: "Tipo removido" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao remover", description: e.message });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure os tipos de documentos que os PJs devem enviar.
        </p>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />Novo tipo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando...
        </div>
      ) : types.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground rounded-lg border border-dashed border-border">
          <FileText className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum tipo de documento configurado</p>
          <Button size="sm" variant="outline" onClick={openCreate}>Criar primeiro tipo</Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Obrigatório</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id} className="border-border hover:bg-accent/20">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {t.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description ?? "—"}</TableCell>
                  <TableCell>
                    {t.validity_days ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{t.validity_days}d
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.is_mandatory ? (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 gap-1">
                        <Shield className="h-3 w-3" />Obrigatório
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Opcional</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deletingId === t.id}
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TypeFormDialog
        editing={editing}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
