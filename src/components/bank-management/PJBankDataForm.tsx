import { useState, useEffect } from "react";
import { z } from "zod";
import { Pencil, Plus, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import {
  useAllPJBankAccounts, useSavePJBankAccount, useDeletePJBankAccount,
  maskSensitive,
  PIX_KEY_TYPE_LABELS, ACCOUNT_TYPE_LABELS,
  type PJBankAccount, type PixKeyType, type AccountType,
} from "@/hooks/usePJBankData";

const schema = z.object({
  pj_id:         z.string().uuid("Selecione um PJ"),
  name:          z.string().min(1, "Nome/descrição obrigatório"),
  bank_code:     z.string().optional(),
  agency:        z.string().optional(),
  account_number:z.string().optional(),
  account_type:  z.enum(["corrente", "poupanca"]).optional(),
  pix_key:       z.string().optional(),
  pix_key_type:  z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]).optional(),
  cnpj_titular:  z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  pj_id: "", name: "", bank_code: "", agency: "", account_number: "",
  account_type: undefined, pix_key: "", pix_key_type: undefined, cnpj_titular: "",
};

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: PJBankAccount | null;
}

function FormDialog({ open, onClose, editing }: FormDialogProps) {
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const { data: providers = [] } = usePJProviders();
  const save = useSavePJBankAccount();

  useEffect(() => {
    if (editing) {
      setForm({
        pj_id:          editing.pj_id,
        name:           editing.name,
        bank_code:      editing.bank_code ?? "",
        agency:         editing.agency ?? "",
        account_number: editing.account_number ?? "",
        account_type:   (editing.account_type as AccountType) ?? undefined,
        pix_key:        editing.pix_key ?? "",
        pix_key_type:   (editing.pix_key_type as PixKeyType) ?? undefined,
        cnpj_titular:   editing.cnpj_titular ?? "",
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
      await save.mutateAsync({ ...result.data, id: editing?.id });
      toast.success(editing ? "Dados bancários atualizados" : "Dados bancários cadastrados");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar dados bancários" : "Cadastrar dados bancários"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PJ */}
          <div className="space-y-1.5">
            <Label>Pessoa Jurídica <span className="text-destructive">*</span></Label>
            <Select value={form.pj_id} onValueChange={(v) => set("pj_id", v)} disabled={!!editing}>
              <SelectTrigger className={errors.pj_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecione o PJ" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.cnpj ? ` — ${p.cnpj}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pj_id && <p className="text-xs text-destructive">{errors.pj_id}</p>}
          </div>

          {/* Nome/descrição */}
          <div className="space-y-1.5">
            <Label>Nome / Descrição <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Conta principal PJ"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Banco e agência */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Código do banco</Label>
              <Input value={form.bank_code ?? ""} onChange={(e) => set("bank_code", e.target.value)} placeholder="001" />
            </div>
            <div className="space-y-1.5">
              <Label>Agência</Label>
              <Input value={form.agency ?? ""} onChange={(e) => set("agency", e.target.value)} placeholder="0001-X" />
            </div>
          </div>

          {/* Conta e tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número da conta</Label>
              <Input value={form.account_number ?? ""} onChange={(e) => set("account_number", e.target.value)} placeholder="12345-6" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de conta</Label>
              <Select
                value={form.account_type ?? "__none__"}
                onValueChange={(v) => set("account_type", v === "__none__" ? undefined : (v as AccountType))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CNPJ titular */}
          <div className="space-y-1.5">
            <Label>CNPJ / CPF do titular</Label>
            <Input value={form.cnpj_titular ?? ""} onChange={(e) => set("cnpj_titular", e.target.value)} placeholder="00.000.000/0000-00" />
          </div>

          {/* PIX */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-sm font-medium">Chave PIX</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo da chave</Label>
                <Select
                  value={form.pix_key_type ?? "__none__"}
                  onValueChange={(v) => set("pix_key_type", v === "__none__" ? undefined : (v as PixKeyType))}
                >
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {Object.entries(PIX_KEY_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Chave PIX</Label>
                <Input value={form.pix_key ?? ""} onChange={(e) => set("pix_key", e.target.value)} placeholder="Digite a chave" />
              </div>
            </div>
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

export function PJBankDataForm() {
  const { data: accounts = [], isLoading } = useAllPJBankAccounts();
  const deleteMutation = useDeletePJBankAccount();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PJBankAccount | null>(null);
  const [deleting, setDeleting] = useState<PJBankAccount | null>(null);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(acc: PJBankAccount) { setEditing(acc); setFormOpen(true); }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync({ id: deleting.id, pjId: deleting.pj_id });
      toast.success("Dados bancários removidos");
      setDeleting(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {isLoading ? "..." : `${accounts.length} conta${accounts.length !== 1 ? "s" : ""} cadastrada${accounts.length !== 1 ? "s" : ""}`}
        </h3>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Cadastrar conta
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Building2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma conta bancária cadastrada para PJs.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">PJ</th>
                <th className="text-left px-4 py-3 font-medium">Banco / Agência</th>
                <th className="text-left px-4 py-3 font-medium">Conta</th>
                <th className="text-left px-4 py-3 font-medium">Chave PIX</th>
                <th className="text-left px-4 py-3 font-medium">CNPJ Titular</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {(acc as any).pj_name ?? acc.pj_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {acc.bank_code ? <span className="font-mono">{acc.bank_code}</span> : "—"}
                    {acc.agency && <span className="ml-1 text-muted-foreground">/ {acc.agency}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {maskSensitive(acc.account_number)}
                    {acc.account_type && (
                      <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                        {ACCOUNT_TYPE_LABELS[acc.account_type as AccountType] ?? acc.account_type}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {acc.pix_key ? (
                      <span className="font-mono">
                        {PIX_KEY_TYPE_LABELS[acc.pix_key_type as PixKeyType] ?? acc.pix_key_type ?? ""}{" "}
                        <span className="text-muted-foreground">{maskSensitive(acc.pix_key)}</span>
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {maskSensitive(acc.cnpj_titular)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(acc)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(acc)} title="Remover"
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

      <FormDialog open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover dados bancários?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados bancários de <strong>{(deleting as any)?.pj_name ?? deleting?.pj_id}</strong> serão removidos permanentemente.
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
