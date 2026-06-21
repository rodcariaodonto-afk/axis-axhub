import { useState, useRef } from "react";
import { z } from "zod";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePJProviders } from "@/hooks/useRepasseAdmin";
import { useCreateNFApproval, parseNFXml } from "@/hooks/useNFApprovals";
import { toast } from "sonner";

const schema = z.object({
  pjId: z.string().uuid("Selecione um PJ"),
  nf_number: z.string().min(1, "Informe o número da NF"),
  nf_series: z.string().optional(),
  nf_value: z
    .string()
    .min(1, "Informe o valor")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Valor deve ser maior que zero"),
  nf_date: z.string().min(1, "Informe a data de emissão"),
  nf_due_date: z.string().optional(),
  cnpj_emitente: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

const ACCEPTED_XML = ["text/xml", "application/xml"];
const ACCEPTED_PDF = ["application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  mode?: "admin" | "portal";
  pjId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NFUploadForm({ mode = "admin", pjId: propPjId, onSuccess, onCancel }: Props) {
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormValues>({
    pjId: propPjId ?? "",
    nf_number: "",
    nf_series: "",
    nf_value: "",
    nf_date: "",
    nf_due_date: "",
    cnpj_emitente: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingXml, setParsingXml] = useState(false);

  const { data: providers = [], isLoading: loadingProviders } = usePJProviders();
  const createNF = useCreateNFApproval();

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleXmlSelect(file: File) {
    if (!ACCEPTED_XML.includes(file.type) && !file.name.endsWith(".xml")) {
      toast.error("Apenas arquivos XML são aceitos");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("XML excede 10 MB");
      return;
    }
    setXmlFile(file);

    // Auto-parse via edge function
    setParsingXml(true);
    try {
      const parsed = await parseNFXml(file);
      setForm((prev) => ({
        ...prev,
        nf_number: parsed.nf_number ?? prev.nf_number,
        nf_series: parsed.nf_series ?? prev.nf_series,
        nf_value: parsed.nf_value != null ? String(parsed.nf_value) : prev.nf_value,
        nf_date: parsed.nf_date ?? prev.nf_date,
        cnpj_emitente: parsed.cnpj_emitente ?? prev.cnpj_emitente,
      }));
      if (parsed.validation_errors?.length) {
        toast.warning(`XML processado com alertas: ${parsed.validation_errors.join(", ")}`);
      } else {
        toast.success("XML processado — campos preenchidos automaticamente");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao processar XML");
    } finally {
      setParsingXml(false);
    }
  }

  function handlePdfSelect(file: File) {
    if (!ACCEPTED_PDF.includes(file.type) && !file.name.endsWith(".pdf")) {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("PDF excede 10 MB");
      return;
    }
    setPdfFile(file);
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
      await createNF.mutateAsync({
        pjId: form.pjId,
        nf_number: form.nf_number,
        nf_series: form.nf_series || undefined,
        nf_value: Number(form.nf_value),
        nf_date: form.nf_date,
        nf_due_date: form.nf_due_date || undefined,
        cnpj_emitente: form.cnpj_emitente || undefined,
        xmlFile,
        pdfFile,
      });
      toast.success("Nota Fiscal enviada para aprovação");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar NF");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* PJ select — apenas no modo admin */}
      {mode === "admin" && (
        <div className="space-y-1.5">
          <Label>Pessoa Jurídica <span className="text-destructive">*</span></Label>
          <Select value={form.pjId} onValueChange={(v) => set("pjId", v)} disabled={loadingProviders}>
            <SelectTrigger className={errors.pjId ? "border-destructive" : ""}>
              <SelectValue placeholder={loadingProviders ? "Carregando..." : "Selecione o PJ"} />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}{p.cnpj ? ` — ${p.cnpj}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.pjId && <p className="text-xs text-destructive">{errors.pjId}</p>}
        </div>
      )}

      {/* Upload XML */}
      <div className="space-y-1.5">
        <Label>Arquivo XML da NF</Label>
        <input
          ref={xmlInputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleXmlSelect(f); e.target.value = ""; }}
        />
        {xmlFile ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 truncate">{xmlFile.name}</span>
            {parsingXml && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {!parsingXml && (
              <button type="button" onClick={() => setXmlFile(null)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => xmlInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Selecionar XML {parsingXml && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">XML NF-e. Campos preenchidos automaticamente após upload.</p>
      </div>

      {/* Upload PDF */}
      <div className="space-y-1.5">
        <Label>PDF da NF <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfSelect(f); e.target.value = ""; }}
        />
        {pdfFile ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-red-500 shrink-0" />
            <span className="flex-1 truncate">{pdfFile.name}</span>
            <button type="button" onClick={() => setPdfFile(null)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="w-full gap-2 border-dashed" onClick={() => pdfInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Selecionar PDF
          </Button>
        )}
      </div>

      {/* Campos da NF */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Número da NF <span className="text-destructive">*</span></Label>
          <Input
            value={form.nf_number}
            onChange={(e) => set("nf_number", e.target.value)}
            placeholder="12345"
            className={errors.nf_number ? "border-destructive" : ""}
          />
          {errors.nf_number && <p className="text-xs text-destructive">{errors.nf_number}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Série</Label>
          <Input value={form.nf_series ?? ""} onChange={(e) => set("nf_series", e.target.value)} placeholder="1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Valor (R$) <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={form.nf_value}
            onChange={(e) => set("nf_value", e.target.value)}
            placeholder="0,00"
            className={errors.nf_value ? "border-destructive" : ""}
          />
          {errors.nf_value && <p className="text-xs text-destructive">{errors.nf_value}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>CNPJ Emitente</Label>
          <Input value={form.cnpj_emitente ?? ""} onChange={(e) => set("cnpj_emitente", e.target.value)} placeholder="00.000.000/0000-00" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data de emissão <span className="text-destructive">*</span></Label>
          <Input
            type="date"
            value={form.nf_date}
            onChange={(e) => set("nf_date", e.target.value)}
            className={errors.nf_date ? "border-destructive" : ""}
          />
          {errors.nf_date && <p className="text-xs text-destructive">{errors.nf_date}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Data de vencimento <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input type="date" value={form.nf_due_date ?? ""} onChange={(e) => set("nf_due_date", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" disabled={createNF.isPending || parsingXml}>
          {createNF.isPending ? "Enviando..." : "Enviar para aprovação"}
        </Button>
      </div>
    </form>
  );
}
