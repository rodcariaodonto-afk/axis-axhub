import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePJSession } from "./PJPortalLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Mail,
  Phone,
  Hash,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

const ACCESS_LABELS: Record<string, { label: string; className: string }> = {
  view:  { label: "Visualização",  className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  edit:  { label: "Edição",        className: "bg-green-500/15 text-green-600 border-green-500/30" },
  admin: { label: "Acesso Total",  className: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
};

function AccessBadge({ level }: { level: string }) {
  const cfg = ACCESS_LABELS[level] ?? { label: level, className: "" };
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

export default function PJPortalProfile() {
  const { pjId, tenantId, tenantName, accessLevel, allAccess } = usePJSession();
  const { user } = useAuth();
  const { toast } = useToast();

  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const { data: account, isLoading } = useQuery({
    queryKey: ["pj-profile-account", pjId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_accounts")
        .select("name, cnpj, email, phone, address_json")
        .eq("id", pjId)
        .single();
      if (error) throw error;
      return data as {
        name: string;
        cnpj: string | null;
        email: string | null;
        phone: string | null;
        address_json: any;
      };
    },
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    setPwLoading(false);
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      setPwSuccess(true);
      setPwForm({ newPassword: "", confirmPassword: "" });
      toast({ title: "Senha alterada com sucesso!" });
      setTimeout(() => setPwSuccess(false), 4000);
    }
  };

  const addr = account?.address_json as any;
  const addressLine = addr
    ? [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(", ")
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Suas informações de acesso e dados da empresa</p>
      </div>

      {/* Dados da empresa */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Dados da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : account ? (
            <div className="grid gap-3">
              <InfoRow icon={Building2} label="Razão Social" value={account.name} />
              {account.cnpj && <InfoRow icon={Hash} label="CNPJ / Documento" value={account.cnpj} />}
              {account.email && <InfoRow icon={Mail} label="E-mail" value={account.email} />}
              {account.phone && <InfoRow icon={Phone} label="Telefone" value={account.phone} />}
              {addressLine && <InfoRow icon={Building2} label="Endereço" value={addressLine} />}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Dados não encontrados.</p>
          )}
        </CardContent>
      </Card>

      {/* Acesso ao portal */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Acesso ao Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Conta de acesso: <span className="font-medium text-foreground">{user?.email}</span>
          </div>

          {allAccess.length === 1 ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tenantName}</p>
                <p className="text-xs text-muted-foreground">Empresa contratante</p>
              </div>
              <AccessBadge level={accessLevel} />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Seus acessos ({allAccess.length})
              </p>
              {allAccess.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                    a.tenant_id === tenantId
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.tenant_name}</p>
                    {a.tenant_id === tenantId && (
                      <p className="text-xs text-primary">Sessão atual</p>
                    )}
                  </div>
                  <AccessBadge level={a.access_level} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segurança — troca de senha */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                disabled={pwLoading}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repita a senha"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                disabled={pwLoading}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={pwLoading} className="w-full sm:w-auto">
              {pwSuccess ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Senha alterada!
                </span>
              ) : pwLoading ? (
                "Salvando..."
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
