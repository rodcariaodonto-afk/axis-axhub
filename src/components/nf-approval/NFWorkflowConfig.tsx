import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNFWorkflowConfig, useTenantUsers, useSaveNFWorkflowConfig } from "@/hooks/useNFWorkflowConfig";
import { toast } from "sonner";

export function NFWorkflowConfig() {
  const { data: config, isLoading } = useNFWorkflowConfig();
  const { data: users = [] } = useTenantUsers();
  const save = useSaveNFWorkflowConfig();

  const [levels, setLevels] = useState(1);
  const [level1, setLevel1] = useState("");
  const [level2, setLevel2] = useState("");
  const [level3, setLevel3] = useState("");
  const [autoPayable, setAutoPayable] = useState(true);

  useEffect(() => {
    if (config) {
      setLevels(config.approval_levels);
      setLevel1(config.level1_approver_id ?? "");
      setLevel2(config.level2_approver_id ?? "");
      setLevel3(config.level3_approver_id ?? "");
      setAutoPayable(config.auto_create_payable);
    }
  }, [config]);

  async function handleSave() {
    try {
      await save.mutateAsync({
        approval_levels: levels,
        level1_approver_id: level1 || null,
        level2_approver_id: levels >= 2 ? (level2 || null) : null,
        level3_approver_id: levels >= 3 ? (level3 || null) : null,
        auto_create_payable: autoPayable,
      });
      toast.success("Configuração salva");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar configuração");
    }
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Carregando configuração...</div>;
  }

  return (
    <Card className="max-w-xl border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Configuração do Workflow de Aprovação</CardTitle>
        </div>
        <CardDescription>
          Defina quantos níveis de aprovação são necessários e quem aprova cada um.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Número de níveis */}
        <div className="space-y-1.5">
          <Label>Níveis de aprovação</Label>
          <Select value={String(levels)} onValueChange={(v) => setLevels(Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 nível</SelectItem>
              <SelectItem value="2">2 níveis</SelectItem>
              <SelectItem value="3">3 níveis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Aprovador nível 1 */}
        <div className="space-y-1.5">
          <Label>Aprovador — Nível 1 <span className="text-destructive">*</span></Label>
          <Select value={level1 || "__none__"} onValueChange={(v) => setLevel1(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o aprovador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Aprovador nível 2 */}
        {levels >= 2 && (
          <div className="space-y-1.5">
            <Label>Aprovador — Nível 2</Label>
            <Select value={level2 || "__none__"} onValueChange={(v) => setLevel2(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o aprovador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Aprovador nível 3 */}
        {levels >= 3 && (
          <div className="space-y-1.5">
            <Label>Aprovador — Nível 3</Label>
            <Select value={level3 || "__none__"} onValueChange={(v) => setLevel3(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o aprovador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Criar payable automaticamente */}
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Criar conta a pagar automaticamente</p>
            <p className="text-xs text-muted-foreground">Ao aprovar a NF, criar payable com valor líquido</p>
          </div>
          <Switch checked={autoPayable} onCheckedChange={setAutoPayable} />
        </div>

        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}
