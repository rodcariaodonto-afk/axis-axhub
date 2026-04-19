import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Send, Users, FileText, CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";
import { ContactPickerModal } from "@/components/campanhas/ContactPickerModal";

interface MetaConnection {
  id: string;
  name: string;
  phone_number: string;
  status: string;
}

interface SendResult {
  phone: string;
  success: boolean;
  error?: string;
}

export function MetaCampaign() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState("");

  // Template state
  const [templateName, setTemplateName] = useState("");
  const [templatePhone, setTemplatePhone] = useState("");
  const [languageCode, setLanguageCode] = useState("pt_BR");
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // Bulk state
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [bulkType, setBulkType] = useState<"text" | "template">("text");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkTemplate, setBulkTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [showContactPicker, setShowContactPicker] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const { data } = await supabase
      .from("whatsapp_meta_connections")
      .select("id, name, phone_number, status")
      .eq("is_active", true)
      .eq("status", "connected");
    if (data) setConnections(data);
  };

  const handleSendTemplate = async () => {
    if (!selectedConnection || !templateName || !templatePhone) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSendingTemplate(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-meta-message", {
        body: {
          connection_id: selectedConnection,
          phone_number: templatePhone,
          message_type: "template",
          template_name: templateName,
          language_code: languageCode,
        },
      });
      if (error) throw error;
      toast({ title: "✅ Template enviado!", description: `Message ID: ${data?.message_id}` });
      setTemplatePhone("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar template", description: err.message, variant: "destructive" });
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleContactsSelected = (phones: string[]) => {
    const existing = bulkNumbers.trim();
    const newNumbers = phones.join("\n");
    setBulkNumbers(existing ? existing + "\n" + newNumbers : newNumbers);
  };

  const handleBulkSend = async () => {
    if (!selectedConnection || !bulkNumbers.trim()) {
      toast({ title: "Selecione uma conexão e informe os números", variant: "destructive" });
      return;
    }
    if (bulkType === "text" && !bulkMessage.trim()) {
      toast({ title: "Informe a mensagem", variant: "destructive" });
      return;
    }
    if (bulkType === "template" && !bulkTemplate.trim()) {
      toast({ title: "Informe o nome do template", variant: "destructive" });
      return;
    }

    const recipients = bulkNumbers
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (recipients.length === 0) {
      toast({ title: "Nenhum número válido encontrado", variant: "destructive" });
      return;
    }

    if (recipients.length > 1000) {
      toast({ title: "Máximo de 1.000 números por disparo", variant: "destructive" });
      return;
    }

    setSending(true);
    setResults([]);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-meta-message", {
        body: {
          connection_id: selectedConnection,
          phone_number: recipients[0],
          message_type: bulkType,
          message_content: bulkType === "text" ? bulkMessage : undefined,
          template_name: bulkType === "template" ? bulkTemplate : undefined,
          language_code: languageCode,
          _bulk: true,
          recipients,
        },
      });

      // Processar em lotes via Edge Function send-bulk
      const bulkRes = await supabase.functions.invoke("send-whatsapp-meta-message", {
        body: {
          _action: "bulk",
          connection_id: selectedConnection,
          recipients,
          message_type: bulkType,
          message_content: bulkType === "text" ? bulkMessage : undefined,
          template_name: bulkType === "template" ? bulkTemplate : undefined,
          language_code: languageCode,
        },
      });

      if (bulkRes.error) throw bulkRes.error;

      const bulkData = bulkRes.data;
      if (bulkData?.results) {
        setResults(bulkData.results);
        setProgress(100);
        const successCount = bulkData.results.filter((r: SendResult) => r.success).length;
        toast({
          title: `✅ Disparo concluído!`,
          description: `${successCount}/${recipients.length} mensagens enviadas com sucesso.`,
        });
      }
    } catch (err: any) {
      toast({ title: "Erro no disparo", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <>
    <div className="space-y-6">
      {/* Seleção de Conexão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-green-500" />
            Conexão Meta API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedConnection} onValueChange={setSelectedConnection}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conexão Meta..." />
            </SelectTrigger>
            <SelectContent>
              {connections.length === 0 && (
                <SelectItem value="none" disabled>Nenhuma conexão Meta ativa</SelectItem>
              )}
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">●</span>
                    {c.name} — {c.phone_number}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {connections.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Crie uma conexão Meta em WhatsApp → Nova Sessão → WhatsApp Cloud API (Meta)
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="template">
        <TabsList className="w-full">
          <TabsTrigger value="template" className="flex-1">
            <FileText className="mr-1 h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1">
            <Users className="mr-1 h-4 w-4" /> Disparo em Massa
          </TabsTrigger>
        </TabsList>

        {/* ABA TEMPLATES */}
        <TabsContent value="template" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Enviar Template Aprovado</CardTitle>
              <p className="text-xs text-muted-foreground">
                Templates precisam estar aprovados no Meta Business Manager antes do envio.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do Template *</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: hello_world"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Nome exato do template na Meta</p>
                </div>
                <div className="space-y-1">
                  <Label>Idioma</Label>
                  <Select value={languageCode} onValueChange={setLanguageCode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt_BR">Português (BR)</SelectItem>
                      <SelectItem value="en_US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Número do Destinatário *</Label>
                <Input
                  value={templatePhone}
                  onChange={(e) => setTemplatePhone(e.target.value)}
                  placeholder="+5511939171383"
                  className="font-mono"
                />
              </div>
              <Button
                onClick={handleSendTemplate}
                disabled={sendingTemplate || !selectedConnection || !templateName || !templatePhone}
                className="w-full gap-2"
              >
                {sendingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingTemplate ? "Enviando..." : "Enviar Template"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA DISPARO EM MASSA */}
        <TabsContent value="bulk" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Disparo em Massa</CardTitle>
              <p className="text-xs text-muted-foreground">Máximo de 1.000 números por disparo.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Tipo de Mensagem</Label>
                <Select value={bulkType} onValueChange={(v) => setBulkType(v as "text" | "template")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto livre</SelectItem>
                    <SelectItem value="template">Template aprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkType === "text" ? (
                <div className="space-y-1">
                  <Label>Mensagem *</Label>
                  <Textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Digite a mensagem que será enviada para todos os números..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Texto livre só funciona para números que já iniciaram conversa com seu número nas últimas 24h.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nome do Template *</Label>
                    <Input value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)} placeholder="hello_world" className="font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label>Idioma</Label>
                    <Select value={languageCode} onValueChange={setLanguageCode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt_BR">Português (BR)</SelectItem>
                        <SelectItem value="en_US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                <Label>Números de Destino * <span className="text-muted-foreground font-normal">(um por linha)</span></Label>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowContactPicker(true)}>
                  <UserPlus className="h-3 w-3" /> Adicionar Contatos
                </Button>
              </div>
                <Textarea
                  value={bulkNumbers}
                  onChange={(e) => setBulkNumbers(e.target.value)}
                  placeholder={"+5511939171383\n+5521999999999\n+5531988888888"}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {bulkNumbers.split("\n").filter((n) => n.trim()).length} números informados
                </p>
              </div>

              <Button
                onClick={handleBulkSend}
                disabled={sending || !selectedConnection || !bulkNumbers.trim()}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Enviando..." : `Disparar para ${bulkNumbers.split("\n").filter((n) => n.trim()).length} números`}
              </Button>
            </CardContent>
          </Card>

          {/* Resultados */}
          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  Resultado do Disparo
                  <Badge variant="default" className="bg-green-600">{successCount} enviados</Badge>
                  {failCount > 0 && <Badge variant="destructive">{failCount} falhas</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                      {r.success
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      }
                      <span className="font-mono">{r.phone}</span>
                      {r.error && <span className="text-xs text-muted-foreground truncate">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>

      <ContactPickerModal
        open={showContactPicker}
        onOpenChange={setShowContactPicker}
        onConfirm={handleContactsSelected}
      />
    </>
  );
}
