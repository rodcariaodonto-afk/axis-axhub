import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { replaceMacros } from "@/lib/contractMacros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, EyeOff, History, PenTool, RotateCcw, FileText, Download } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import ClicksignSignaturePanel from "@/components/contracts/ClicksignSignaturePanel";

const statusOptions = ["Em elaboracao", "Ativo", "Expirado", "Cancelado", "Renovado"];
const statusColors: Record<string, string> = {
  "Em elaboracao": "bg-muted text-muted-foreground",
  "Ativo": "bg-green-500/20 text-green-400",
  "Expirado": "bg-destructive/20 text-destructive",
  "Cancelado": "bg-foreground/20 text-foreground",
  "Renovado": "bg-blue-500/20 text-blue-400",
};
const sigStatusColors: Record<string, string> = {
  "Unsigned": "bg-muted text-muted-foreground",
  "Pending": "bg-yellow-500/20 text-yellow-400",
  "PartiallySigned": "bg-blue-500/20 text-blue-400",
  "Signed": "bg-green-500/20 text-green-400",
  "Cancelado": "bg-destructive/20 text-destructive",
  "Expirado": "bg-destructive/20 text-destructive",
};
const typeOptions = ["Servico", "Venda", "Parceria", "Licenca", "Outro"];
const currencyOptions = ["BRL", "USD", "EUR"];

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground">—</span>;
  if (days < 0) return <Badge className="bg-destructive/20 text-destructive">Vencido ({Math.abs(days)}d)</Badge>;
  if (days <= 30) return <Badge className="bg-yellow-500/20 text-yellow-400">{days} dias</Badge>;
  return <Badge className="bg-green-500/20 text-green-400">{days} dias</Badge>;
}

function ActivitiesTab({ contractId, navigate }: { contractId: string; navigate: (path: string) => void }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("activities").select("*").eq("contract_id", contractId).eq("is_active", true)
      .order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => { setActivities(data || []); setLoading(false); });
  }, [contractId]);
  if (loading) return <Card className="border-border"><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  if (activities.length === 0) return <Card className="border-border"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma atividade vinculada ao contrato.</CardContent></Card>;
  return (
    <Card className="border-border"><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Assunto</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Prazo</TableHead></TableRow></TableHeader>
        <TableBody>
          {activities.map((a) => (
            <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/activities/${a.id}`)}>
              <TableCell className="font-medium">{a.title}</TableCell>
              <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
              <TableCell><Badge variant={a.status === "Completed" ? "default" : "secondary"}>{a.status === "Open" ? "Aberta" : a.status === "Completed" ? "Concluída" : "Cancelada"}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{a.due_at ? new Date(a.due_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

const auditStatusLabels: Record<string, string> = {
  pending: "Pendente",
  verified: "Verificado",
  expired: "Expirado",
  failed: "Falhou",
};
const auditStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  verified: "bg-green-500/20 text-green-400",
  expired: "bg-muted text-muted-foreground",
  failed: "bg-destructive/20 text-destructive",
};

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contract, setContract] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [changeDescription, setChangeDescription] = useState("");
  const [agreed, setAgreed] = useState(false);

  // (Assinatura agora gerenciada pelo ClicksignSignaturePanel)

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    const [cRes, aRes, dRes, uRes, vRes, sRes, tRes, alRes] = await Promise.all([
      supabase.from("contracts").select("*, crm_accounts(id, name, cnpj, phone, email, segment, website)").eq("id", id).single(),
      supabase.from("crm_accounts").select("id, name, cnpj, phone, email, segment, website").order("name"),
      supabase.from("deals").select("id, name, estimated_value, status").order("name"),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("contract_versions").select("*").eq("contract_id", id).order("version_number", { ascending: false }),
      supabase.from("contract_signatures").select("*").eq("contract_id", id).order("signed_at", { ascending: false }),
      supabase.from("contract_templates").select("id, name, type, content").eq("is_active", true).order("name"),
      supabase.from("signature_audit_logs").select("*").eq("contract_id", id).order("created_at", { ascending: false }),
    ]);
    if (cRes.error || !cRes.data) { navigate("/contracts"); return; }
    setContract(cRes.data);
    setAccounts(aRes.data || []);
    setDeals(dRes.data || []);
    setUsers(uRes.data || []);
    setVersions(vRes.data || []);
    setSignatures(sRes.data || []);
    setTemplates(tRes.data || []);
    setAuditLogs(alRes.data || []);
    setLoading(false);
  }, [id, navigate]);

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    const account = accounts.find(a => a.id === form.account_id);
    const deal = deals.find(d => d.id === form.deal_id);
    const currentUser = users.find(u => u.id === form.owner_id);
    const contractData = {
      name: form.name, contract_type: form.contract_type, value: form.value ? parseFloat(form.value) : null,
      currency: form.currency, start_date: form.start_date, end_date: form.end_date, renewal_date: form.renewal_date,
    };
    const filled = replaceMacros(tpl.content, { account, deal, contract: contractData, user: currentUser ? { full_name: currentUser.full_name, email: currentUser.email } : undefined });
    setForm((f: any) => ({ ...f, description: filled }));
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openEdit = () => {
    const c = contract;
    setForm({
      name: c.name, account_id: c.account_id || "", deal_id: c.deal_id || "",
      status: c.status, start_date: c.start_date || "", end_date: c.end_date || "",
      value: c.value ? String(c.value) : "", document_url: c.document_url || "",
      description: c.description || "", contract_type: c.contract_type || "",
      currency: c.currency || "BRL", renewal_date: c.renewal_date || "",
      owner_id: c.owner_id || "",
    });
    setChangeDescription("");
    setEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_id) { toast({ title: "Conta obrigatória", variant: "destructive" }); return; }
    if (!form.owner_id) { toast({ title: "Proprietário obrigatório", variant: "destructive" }); return; }
    if (form.start_date && form.end_date && form.start_date >= form.end_date) {
      toast({ title: "Data início deve ser anterior à data término", variant: "destructive" }); return;
    }

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data: profile } = await supabase.from("profiles").select("id, tenant_id").eq("id", u.id).single();
    if (!profile) return;

    const nextVersion = (versions[0]?.version_number || 0) + 1;
    await supabase.from("contract_versions").insert({
      contract_id: id, version_number: nextVersion, name: contract.name,
      description: contract.description, contract_type: contract.contract_type,
      status: contract.status, value: contract.value, currency: contract.currency,
      start_date: contract.start_date, end_date: contract.end_date,
      renewal_date: contract.renewal_date, changed_by_id: profile.id,
      change_description: changeDescription || "Edição manual",
      tenant_id: profile.tenant_id,
    });

    const payload: any = {
      name: form.name, account_id: form.account_id || null,
      deal_id: form.deal_id || null, status: form.status,
      start_date: form.start_date || null, end_date: form.end_date || null,
      value: form.value ? parseFloat(form.value) : null,
      document_url: form.document_url || null, updated_at: new Date().toISOString(),
      description: form.description || null, contract_type: form.contract_type || null,
      currency: form.currency, renewal_date: form.renewal_date || null,
      owner_id: form.owner_id || null,
    };

    const { error } = await supabase.from("contracts").update(payload).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Contrato atualizado!" }); setEditOpen(false); fetchAll(); }
  };

  const restoreVersion = async (v: any) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data: profile } = await supabase.from("profiles").select("id, tenant_id").eq("id", u.id).single();
    if (!profile) return;

    const nextVersion = (versions[0]?.version_number || 0) + 1;
    await supabase.from("contract_versions").insert({
      contract_id: id, version_number: nextVersion, name: contract.name,
      description: contract.description, contract_type: contract.contract_type,
      status: contract.status, value: contract.value, currency: contract.currency,
      start_date: contract.start_date, end_date: contract.end_date,
      renewal_date: contract.renewal_date, changed_by_id: profile.id,
      change_description: `Restaurado da versão ${v.version_number}`,
      tenant_id: profile.tenant_id,
    });

    await supabase.from("contracts").update({
      name: v.name, description: v.description, contract_type: v.contract_type,
      status: v.status, value: v.value, currency: v.currency,
      start_date: v.start_date, end_date: v.end_date,
      renewal_date: v.renewal_date, updated_at: new Date().toISOString(),
    }).eq("id", id);

    toast({ title: `Restaurado para versão ${v.version_number}` });
    setHistoryOpen(false);
    fetchAll();
  };

  const deactivate = async () => {
    await supabase.from("contracts").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Contrato desativado!" });
    navigate("/contracts");
  };

  // Canvas drawing
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  const stopDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleSign = async () => {
    if (!agreed) { toast({ title: "Aceite os termos", variant: "destructive" }); return; }
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (!dataUrl) return;

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data: profile } = await supabase.from("profiles").select("id, tenant_id").eq("id", u.id).single();
    if (!profile) return;

    const token = crypto.randomUUID();
    await supabase.from("contract_signatures").insert({
      contract_id: id, signer_id: profile.id, signature_url: dataUrl,
      signature_token: token, tenant_id: profile.tenant_id,
    });
    await supabase.from("contracts").update({
      signature_status: "Signed", signed_by_id: profile.id,
      signed_at: new Date().toISOString(), signature_token: token,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    toast({ title: "Contrato assinado!" });
    setSignOpen(false);
    setAgreed(false);
    fetchAll();
  };

  // --- Audit export (mantido para LGPD) ---
  const exportAuditJson = () => {
    const exportData = auditLogs.map((log) => ({
      id: log.id,
      contract_id: log.contract_id,
      signer_email: log.signer_email,
      signer_name: log.signer_name,
      status: log.status,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      signed_at: log.signed_at,
      created_at: log.created_at,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-contrato-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };


  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  if (!contract) return null;

  const days = contract.end_date ? differenceInDays(parseISO(contract.end_date), new Date()) : null;
  const ownerName = users.find(u => u.id === contract.owner_id)?.full_name || users.find(u => u.id === contract.owner_id)?.email || "—";
  const formatCurrency = (v: number | null, cur: string = "BRL") =>
    v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: cur }) : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contracts")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{contract.name}</h1>
              <Badge className={statusColors[contract.status] || ""}>{contract.status}</Badge>
              <Badge className={sigStatusColors[contract.signature_status] || "bg-muted text-muted-foreground"}>{contract.signature_status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHistoryOpen(true)}><History className="mr-2 h-4 w-4" />Versões</Button>
          <Button variant="outline" onClick={openEdit}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
          <Button variant="destructive" onClick={deactivate}><EyeOff className="mr-2 h-4 w-4" />Desativar</Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="signature">Assinatura</TabsTrigger>
          <TabsTrigger value="electronic-signature">Assinatura Eletrônica (OTP)</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Conta</span>
                  {contract.crm_accounts?.name ? (
                    <button onClick={() => navigate(`/accounts/${contract.crm_accounts?.id || contract.account_id}`)} className="text-primary hover:underline">{contract.crm_accounts.name}</button>
                  ) : <span className="text-destructive">Sem Conta</span>}
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{contract.contract_type || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Proprietário</span><span>{ownerName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span>{new Date(contract.created_at).toLocaleDateString("pt-BR")}</span></div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Financeiro</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-semibold text-lg">{formatCurrency(contract.value, contract.currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Moeda</span><span>{contract.currency}</span></div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Datas</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span>{contract.start_date ? new Date(contract.start_date).toLocaleDateString("pt-BR") : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Término</span><span>{contract.end_date ? new Date(contract.end_date).toLocaleDateString("pt-BR") : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Renovação</span><span>{contract.renewal_date ? new Date(contract.renewal_date).toLocaleDateString("pt-BR") : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dias até vencimento</span><ExpiryBadge days={days} /></div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.description || "Sem descrição."}</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="signature" className="space-y-6 mt-4">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assinatura Digital (Canvas)</CardTitle>
                {contract.signature_status !== "Signed" && (
                  <Button onClick={() => setSignOpen(true)}><PenTool className="mr-2 h-4 w-4" />Assinar Contrato</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={sigStatusColors[contract.signature_status] || ""}>{contract.signature_status}</Badge>
                {contract.signed_at && <span className="text-xs text-muted-foreground">em {new Date(contract.signed_at).toLocaleString("pt-BR")}</span>}
              </div>
              {signatures.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Assinante</TableHead><TableHead>Token</TableHead><TableHead>Válida</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {signatures.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{new Date(s.signed_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{users.find(u => u.id === s.signer_id)?.full_name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{s.signature_token?.slice(0, 8)}...</TableCell>
                        <TableCell>{s.is_valid ? <Badge className="bg-green-500/20 text-green-400">Sim</Badge> : <Badge className="bg-destructive/20 text-destructive">Não</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="electronic-signature" className="space-y-6 mt-4">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Gerar Documento PDF</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Gere o PDF do contrato para envio ao signatário. O documento será armazenado de forma segura.</p>
              <div className="flex items-center gap-4">
                <Button onClick={handleGeneratePdf} disabled={pdfGenerating}>
                  <FileText className="mr-2 h-4 w-4" />
                  {pdfGenerating ? "Gerando..." : "Gerar PDF"}
                </Button>
                {(pdfUrl || contract.document_url) && (
                  <a href={pdfUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Download className="h-3 w-3" /> Download PDF
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Solicitar Assinatura (OTP)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Informe os dados do signatário e envie o código OTP de 6 dígitos por e-mail.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Signatário</Label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail do Signatário *</Label>
                  <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="email@exemplo.com" required />
                </div>
              </div>
              <Button onClick={handleRequestOtp} disabled={otpSending || contract.signature_status === "Signed"}>
                <Mail className="mr-2 h-4 w-4" />
                {otpSending ? "Enviando..." : "Enviar Código OTP"}
              </Button>
            </CardContent>
          </Card>

          {contract.signature_status === "Pending" && (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verificar Código e Assinar</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Insira o código de 6 dígitos recebido por e-mail para confirmar a assinatura.</p>
                <div className="flex items-center gap-4">
                  <InputOTP maxLength={6} value={otpCode} onChange={(value) => setOtpCode(value)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button onClick={handleVerifyOtp} disabled={otpVerifying || otpCode.length !== 6}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {otpVerifying ? "Verificando..." : "Verificar e Assinar"}
                </Button>
              </CardContent>
            </Card>
          )}

          {contract.signature_status === "Signed" && (
            <Card className="border-border border-green-500/30">
              <CardContent className="py-6 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-400" />
                <div>
                  <p className="font-semibold text-green-400">Contrato assinado eletronicamente</p>
                  <p className="text-sm text-muted-foreground">
                    Assinado em {contract.signed_at ? new Date(contract.signed_at).toLocaleString("pt-BR") : "—"}
                    {contract.signer_email && ` por ${contract.signer_email}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Trilha de Auditoria (Lei 14.063/2020)</CardTitle>
                {auditLogs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={exportAuditJson}>
                    <Download className="mr-2 h-3 w-3" /> Exportar JSON (LGPD)
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de auditoria ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Assinado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-sm">{log.signer_email}</TableCell>
                        <TableCell className="text-sm">{log.signer_name || "—"}</TableCell>
                        <TableCell>
                          <Badge className={auditStatusColors[log.status] || "bg-muted text-muted-foreground"}>
                            {auditStatusLabels[log.status] || log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address || "—"}</TableCell>
                        <TableCell className="text-xs">{log.signed_at ? new Date(log.signed_at).toLocaleString("pt-BR") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <ActivitiesTab contractId={id!} navigate={navigate} />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Contrato</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta *</Label>
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proprietário *</Label>
                <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Título *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Aplicar Template (opcional)</Label>
                <Select onValueChange={(v) => applyTemplate(v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione um template..." /></SelectTrigger>
                  <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              <div className="space-y-2"><Label>URL do Documento</Label><Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Término</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Renovação</Label><Input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Descrição da Alteração</Label>
              <Input value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} placeholder="O que foi alterado nesta edição..." />
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Version History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de Versões</DialogTitle></DialogHeader>
          {versions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma versão anterior encontrada.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Versão</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Valor</TableHead><TableHead>Alteração</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono">v{v.version_number}</TableCell>
                    <TableCell>{new Date(v.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge className={statusColors[v.status] || ""}>{v.status}</Badge></TableCell>
                    <TableCell>{v.value != null ? v.value.toLocaleString("pt-BR", { style: "currency", currency: v.currency || "BRL" }) : "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{v.change_description || "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => restoreVersion(v)}><RotateCcw className="mr-1 h-3 w-3" />Restaurar</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign Modal (Canvas) */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Assinar Contrato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Desenhe sua assinatura no campo abaixo:</p>
            <div className="border border-border rounded-md overflow-hidden">
              <canvas
                ref={canvasRef}
                width={440}
                height={200}
                className="w-full bg-background cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearCanvas}>Limpar</Button>
            <div className="flex items-center gap-2">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
              <label htmlFor="agree" className="text-sm">Concordo que esta assinatura é válida e vinculante.</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSignOpen(false)}>Cancelar</Button>
              <Button onClick={handleSign} disabled={!agreed}>Confirmar Assinatura</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
