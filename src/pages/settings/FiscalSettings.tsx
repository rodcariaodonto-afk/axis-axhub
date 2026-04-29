import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDocument } from "@/lib/documentMask";
import { BRAZILIAN_STATES } from "@/hooks/useAddressCep";
import { AlertCircle, Upload, ShieldCheck, FileWarning, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FiscalForm {
  company_name: string;
  cnpj: string;
  ie: string;
  im: string;
  regime_tributario: string;
  endereco_cep: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_municipio: string;
  endereco_uf: string;
  codigo_municipio_ibge: string;
  habilita_nfe: boolean;
  habilita_nfse: boolean;
  habilita_nfce: boolean;
  focus_environment: string;
  focus_token_homologacao: string;
  focus_token_producao: string;
}

const formatCEP = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

export default function FiscalSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [certPassword, setCertPassword] = useState("");

  const { data: tenantId } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_tenant_id");
      return data as string;
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["fiscal-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("fiscal_settings").select("*").eq("tenant_id", tenantId!).maybeSingle();
      return data;
    },
  });

  const form = useForm<FiscalForm>({
    defaultValues: {
      company_name: "", cnpj: "", ie: "", im: "", regime_tributario: "1",
      endereco_cep: "", endereco_logradouro: "", endereco_numero: "", endereco_complemento: "",
      endereco_bairro: "", endereco_municipio: "", endereco_uf: "", codigo_municipio_ibge: "",
      habilita_nfe: false, habilita_nfse: false, habilita_nfce: false,
      focus_environment: "homologacao", focus_token_homologacao: "", focus_token_producao: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        company_name: settings.company_name || "",
        cnpj: settings.cnpj ? formatDocument(settings.cnpj) : "",
        ie: settings.ie || "",
        im: settings.im || "",
        regime_tributario: String(settings.regime_tributario || 1),
        endereco_cep: settings.endereco_cep || "",
        endereco_logradouro: settings.endereco_logradouro || "",
        endereco_numero: settings.endereco_numero || "",
        endereco_complemento: settings.endereco_complemento || "",
        endereco_bairro: settings.endereco_bairro || "",
        endereco_municipio: settings.endereco_municipio || "",
        endereco_uf: settings.endereco_uf || "",
        codigo_municipio_ibge: settings.codigo_municipio_ibge || "",
        habilita_nfe: !!settings.habilita_nfe,
        habilita_nfse: !!settings.habilita_nfse,
        habilita_nfce: !!settings.habilita_nfce,
        focus_environment: settings.focus_environment || "homologacao",
        focus_token_homologacao: settings.focus_token_homologacao || "",
        focus_token_producao: settings.focus_token_producao || "",
      });
    }
  }, [settings]);

  const saveCompany = useMutation({
    mutationFn: async (v: FiscalForm) => {
      if (!tenantId) throw new Error("Sem tenant");
      if (!v.company_name?.trim()) throw new Error("Razão Social é obrigatória");
      const cnpjDigits = v.cnpj.replace(/\D/g, "");
      if (cnpjDigits.length !== 14) throw new Error("CNPJ inválido — deve ter 14 dígitos");
      const { error } = await supabase.from("fiscal_settings").upsert({
        tenant_id: tenantId,
        company_name: v.company_name.trim(),
        cnpj: cnpjDigits,
        ie: v.ie || null,
        im: v.im || null,
        regime_tributario: parseInt(v.regime_tributario) || 1,
        endereco_cep: v.endereco_cep || null,
        endereco_logradouro: v.endereco_logradouro || null,
        endereco_numero: v.endereco_numero || null,
        endereco_complemento: v.endereco_complemento || null,
        endereco_bairro: v.endereco_bairro || null,
        endereco_municipio: v.endereco_municipio || null,
        endereco_uf: v.endereco_uf || null,
        codigo_municipio_ibge: v.codigo_municipio_ibge || null,
        habilita_nfe: v.habilita_nfe,
        habilita_nfse: v.habilita_nfse,
        habilita_nfce: v.habilita_nfce,
      }, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiscal-settings"] });
      toast({ title: "Dados fiscais salvos com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const saveFocus = useMutation({
    mutationFn: async (v: FiscalForm) => {
      if (!tenantId) throw new Error("Sem tenant");
      // Garante existência mínima do registro
      if (!settings) {
        if (!v.company_name?.trim() || v.cnpj.replace(/\D/g, "").length !== 14) {
          throw new Error("Preencha primeiro Razão Social e CNPJ na aba 'Dados da Empresa'");
        }
      }
      const { error } = await supabase.from("fiscal_settings").upsert({
        tenant_id: tenantId,
        company_name: settings?.company_name || v.company_name.trim(),
        cnpj: settings?.cnpj || v.cnpj.replace(/\D/g, ""),
        regime_tributario: settings?.regime_tributario || parseInt(v.regime_tributario) || 1,
        focus_environment: v.focus_environment,
        focus_token_homologacao: v.focus_token_homologacao || null,
        focus_token_producao: v.focus_token_producao || null,
      }, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiscal-settings"] });
      toast({ title: "Configurações da Focus NFe salvas" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    if (!file.name.toLowerCase().endsWith(".pfx")) {
      toast({ title: "Arquivo inválido", description: "Envie apenas arquivos .pfx", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    if (!settings) {
      toast({ title: "Salve os Dados da Empresa antes de enviar o certificado", variant: "destructive" });
      return;
    }
    setUploadingCert(true);
    const path = `${tenantId}/certificado.pfx`;
    const { error: upErr } = await supabase.storage.from("fiscal-certificates").upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingCert(false);
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { error: updErr } = await supabase.from("fiscal_settings").update({
      certificate_path: path,
      certificate_uploaded_at: new Date().toISOString(),
      certificate_registered_on_focus: false,
    }).eq("tenant_id", tenantId);
    setUploadingCert(false);
    if (updErr) {
      toast({ title: "Erro ao atualizar", description: updErr.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["fiscal-settings"] });
    toast({ title: "Certificado enviado com sucesso" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const watchEnv = form.watch("focus_environment");

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Configurações Fiscais</CardTitle>
        <CardDescription>Configure os dados da empresa, integração com Focus NFe e certificado digital A1.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="empresa" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="empresa">Dados da Empresa</TabsTrigger>
            <TabsTrigger value="focus">Focus NFe</TabsTrigger>
            <TabsTrigger value="certificado">Certificado Digital</TabsTrigger>
          </TabsList>

          {/* === ABA 1 === */}
          <TabsContent value="empresa" className="mt-6">
            <form onSubmit={form.handleSubmit((v) => saveCompany.mutate(v))} className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Razão Social *</Label>
                  <Input {...form.register("company_name")} placeholder="Empresa LTDA" />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ *</Label>
                  <Input
                    value={form.watch("cnpj")}
                    onChange={(e) => form.setValue("cnpj", formatDocument(e.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Regime Tributário *</Label>
                  <Select value={form.watch("regime_tributario")} onValueChange={(v) => form.setValue("regime_tributario", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — Simples Nacional</SelectItem>
                      <SelectItem value="2">2 — Simples Nacional - Excesso</SelectItem>
                      <SelectItem value="3">3 — Regime Normal (Lucro Presumido/Real)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Inscrição Estadual (IE)</Label>
                  <Input {...form.register("ie")} placeholder="Opcional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Inscrição Municipal (IM)</Label>
                  <Input {...form.register("im")} placeholder="Opcional" />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-sm font-semibold">Endereço Fiscal</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>CEP</Label>
                    <Input
                      value={form.watch("endereco_cep")}
                      onChange={(e) => form.setValue("endereco_cep", formatCEP(e.target.value))}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Logradouro</Label>
                    <Input {...form.register("endereco_logradouro")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Número</Label>
                    <Input {...form.register("endereco_numero")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Complemento</Label>
                    <Input {...form.register("endereco_complemento")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bairro</Label>
                    <Input {...form.register("endereco_bairro")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Município</Label>
                    <Input {...form.register("endereco_municipio")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>UF</Label>
                    <Select value={form.watch("endereco_uf")} onValueChange={(v) => form.setValue("endereco_uf", v)}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {BRAZILIAN_STATES.map((s) => (
                          <SelectItem key={s.uf} value={s.uf}>{s.uf} — {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Código IBGE</Label>
                    <Input
                      {...form.register("codigo_municipio_ibge")}
                      maxLength={7}
                      placeholder="0000000"
                    />
                    <p className="text-xs text-muted-foreground">Código IBGE de 7 dígitos. Consulte em ibge.gov.br</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold">Tipos de Nota Habilitados</h3>
                {[
                  { name: "habilita_nfe" as const, label: "NF-e (Nota Fiscal Eletrônica de produto)" },
                  { name: "habilita_nfse" as const, label: "NFS-e (Nota Fiscal de Serviço Eletrônica)" },
                  { name: "habilita_nfce" as const, label: "NFC-e (Nota Fiscal de Consumidor)" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-3 border border-border rounded-md">
                    <Label htmlFor={s.name} className="cursor-pointer">{s.label}</Label>
                    <Switch
                      id={s.name}
                      checked={form.watch(s.name)}
                      onCheckedChange={(v) => form.setValue(s.name, v)}
                    />
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={saveCompany.isPending}>
                {saveCompany.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </TabsContent>

          {/* === ABA 2 === */}
          <TabsContent value="focus" className="mt-6">
            <form onSubmit={form.handleSubmit((v) => saveFocus.mutate(v))} className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label>Ambiente *</Label>
                <Select value={form.watch("focus_environment")} onValueChange={(v) => form.setValue("focus_environment", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homologacao">Homologação (testes, sem efeito fiscal)</SelectItem>
                    <SelectItem value="producao">Produção (efeito fiscal real)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watchEnv === "producao" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    Notas emitidas em produção têm validade fiscal e tributária. Cancelamento só é possível em até 24h.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label>Token Homologação</Label>
                <Input type="password" {...form.register("focus_token_homologacao")} placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>Token Produção</Label>
                <Input type="password" {...form.register("focus_token_producao")} placeholder="••••••••" />
              </div>

              <p className="text-xs text-muted-foreground">
                Tokens disponíveis no painel da Focus NFe (focusnfe.com.br) ao cadastrar a empresa.
              </p>

              <div className="flex gap-2">
                <Button type="submit" disabled={saveFocus.isPending}>
                  {saveFocus.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toast({ title: "Funcionalidade em construção" })}
                >
                  Testar Conexão
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* === ABA 3 === */}
          <TabsContent value="certificado" className="mt-6">
            <div className="space-y-4 max-w-2xl">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Certificado Digital A1</AlertTitle>
                <AlertDescription>
                  Faça upload do certificado A1 (.pfx) da empresa. A senha será solicitada apenas no momento de
                  registrar a empresa na Focus NFe — ela nunca é armazenada no AXIS por segurança.
                </AlertDescription>
              </Alert>

              {!settings?.certificate_path ? (
                <Alert variant="destructive">
                  <FileWarning className="h-4 w-4" />
                  <AlertTitle>Nenhum certificado enviado</AlertTitle>
                  <AlertDescription>Envie o arquivo .pfx para habilitar a emissão de notas.</AlertDescription>
                </Alert>
              ) : (
                <div className="border border-border rounded-md p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium">Certificado enviado</p>
                      <p className="text-xs text-muted-foreground">
                        {settings.certificate_uploaded_at
                          ? format(new Date(settings.certificate_uploaded_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                          : "—"}
                      </p>
                    </div>
                    {settings.certificate_registered_on_focus ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Registrado na Focus</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">Pendente registro</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Enviar certificado (.pfx, máx. 5MB)</Label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pfx"
                    onChange={handleCertUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCert}
                  >
                    {uploadingCert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploadingCert ? "Enviando..." : "Selecionar arquivo .pfx"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setRegisterDialogOpen(true)}
                  disabled={!settings?.certificate_path || settings?.certificate_registered_on_focus}
                >
                  Registrar empresa na Focus NFe
                </Button>
                {!settings?.certificate_path && (
                  <p className="text-xs text-muted-foreground">Faça upload do certificado primeiro</p>
                )}
                {settings?.certificate_registered_on_focus && (
                  <p className="text-xs text-muted-foreground">Empresa já registrada na Focus</p>
                )}
              </div>
            </div>

            <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar empresa na Focus NFe</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Label>Senha do certificado</Label>
                  <Input type="password" value={certPassword} onChange={(e) => setCertPassword(e.target.value)} placeholder="••••••••" />
                  <p className="text-xs text-muted-foreground">A senha não será armazenada — usada apenas para o registro na Focus.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={() => {
                    setRegisterDialogOpen(false);
                    setCertPassword("");
                    toast({
                      title: "Funcionalidade em construção",
                      description: "Edge function register-company-on-focus será implementada em breve.",
                    });
                  }}>Confirmar registro</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
