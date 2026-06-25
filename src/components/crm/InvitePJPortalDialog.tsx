import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useInvitePJPortal } from "@/hooks/useInvitePJPortal";
import { Mail } from "lucide-react";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  access_level: z.enum(["view", "edit", "admin"]),
});

const ACCESS_LEVEL_OPTIONS = [
  { value: "view",  label: "Visualizar — leitura de contratos, repasses e documentos" },
  { value: "edit",  label: "Editar — pode enviar NFs e documentos" },
  { value: "admin", label: "Acesso Total — todas as ações do portal" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pjId: string;
  pjName: string;
}

export function InvitePJPortalDialog({ open, onOpenChange, pjId, pjName }: Props) {
  const { toast } = useToast();
  const { mutate: invite, isPending } = useInvitePJPortal();

  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"view" | "edit" | "admin">("view");
  const [emailError, setEmailError] = useState("");

  const reset = () => {
    setEmail("");
    setAccessLevel("view");
    setEmailError("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    const parsed = schema.safeParse({ email: email.trim(), access_level: accessLevel });
    if (!parsed.success) {
      setEmailError(parsed.error.flatten().fieldErrors.email?.[0] ?? "");
      return;
    }

    invite(
      { pj_id: pjId, email: parsed.data.email, access_level: parsed.data.access_level },
      {
        onSuccess: (data) => {
          toast({
            title: "Convite enviado!",
            description: data.is_new_user
              ? `Um e-mail de convite foi enviado para ${parsed.data.email}. O usuário deverá definir sua senha.`
              : `${parsed.data.email} já tinha cadastro e agora tem acesso ao portal.`,
          });
          handleClose(false);
        },
        onError: (err: any) => {
          toast({
            title: "Erro ao enviar convite",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Convidar para o Portal PJ
          </DialogTitle>
          <DialogDescription>
            Enviar acesso ao Portal de Prestadores para <strong>{pjName}</strong>.
            O convidado receberá um e-mail para definir sua senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail *</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="prestador@empresa.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              disabled={isPending}
              required
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Nível de Acesso</Label>
            <Select
              value={accessLevel}
              onValueChange={(v) => setAccessLevel(v as typeof accessLevel)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar Convite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
