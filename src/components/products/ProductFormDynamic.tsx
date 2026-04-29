
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { PRODUCT_TYPES, ProductType, getVisibleFields, generateVariations, VariationConfig, GeneratedVariation, isSKURequired, generateAutoSKU, SaaSPlan } from "@/lib/productUtils";
import SaaSPlanEditor from "./SaaSPlanEditor";
import VariationSelector from "./VariationSelector";
import VariationPreview from "./VariationPreview";
import ChannelSelector, { ChannelConfig } from "./ChannelSelector";

interface ProductFormDynamicProps {
  categories: { id: string; name: string }[];
  customFields: { id: string; field_name: string; field_type: string; options: string[]; is_required: boolean }[];
  onSuccess: () => void;
  onClose: () => void;
}

const parseBRCurrency = (v: string): number => {
  if (!v) return 0;
  // If has comma, treat as BR format: "20.000,50" → "20000.50"
  if (v.includes(",")) return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
  // Otherwise plain number: "20000" or "20000.50"
  return parseFloat(v) || 0;
};

export default function ProductFormDynamic({ categories, customFields, onSuccess, onClose }: ProductFormDynamicProps) {
  const [productType, setProductType] = useState<ProductType>("simple_product");
  const [form, setForm] = useState({ sku: "", name: "", price: "", cost: "", category: "", description: "" });
  const [fiscal, setFiscal] = useState({
    ncm: "",
    cfop: "",
    cfop_custom: "",
    cst: "",
    unidade_fiscal: "",
    unidade_custom: "",
    origem_icms: "",
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [variationConfigs, setVariationConfigs] = useState<VariationConfig[]>([]);
  const [generatedVariations, setGeneratedVariations] = useState<GeneratedVariation[]>([]);
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [saasPlans, setSaasPlans] = useState<SaaSPlan[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const visibleFields = getVisibleFields(productType);
  const skuRequired = isSKURequired(productType, form.category, variationConfigs.length > 0);

  // Regenerate variations when configs change
  useEffect(() => {
    if (variationConfigs.length > 0 && form.sku && form.name) {
      const vars = generateVariations(form.sku, form.name, parseBRCurrency(form.price), parseBRCurrency(form.cost), variationConfigs);
      setGeneratedVariations(vars);
    } else {
      setGeneratedVariations([]);
    }
  }, [variationConfigs, form.sku, form.name, form.price, form.cost]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem inválida (máx. 5MB)", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    // Auto-generate SKU if optional and empty
    let finalSku = form.sku.trim();
    if (!finalSku) {
      if (skuRequired) {
        toast({ title: "SKU é obrigatório para esta categoria/tipo", variant: "destructive" });
        setUploading(false);
        return;
      }
      finalSku = generateAutoSKU(form.category, form.name);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) { setUploading(false); return; }

    // Map productType to DB type field
    const dbType = productType === "service" ? "service" : "product";
    const isSaas = productType === "saas";

    const cfopFinal = fiscal.cfop === "outro" ? fiscal.cfop_custom.trim() : fiscal.cfop;
    const unidadeFinal = fiscal.unidade_fiscal === "outro" ? fiscal.unidade_custom.trim() : fiscal.unidade_fiscal;

    const { data: product, error } = await supabase.from("products").insert({
      tenant_id: profile.tenant_id,
      sku: finalSku,
      name: form.name,
      type: dbType,
      category: form.category || null,
      price: isSaas ? 0 : parseBRCurrency(form.price),
      cost: isSaas ? 0 : parseBRCurrency(form.cost),
      is_parent: isSaas,
      is_subscription: isSaas,
      ncm: fiscal.ncm || null,
      cfop: cfopFinal || null,
      cst: fiscal.cst || null,
      unidade_fiscal: unidadeFinal || null,
      origem_icms: fiscal.origem_icms || null,
    } as any).select().single();

    if (error || !product) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Upload image
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${product.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        await supabase.from("products").update({ image_url: urlData.publicUrl }).eq("id", product.id);
      }
    }

    // Save custom values
    const valuesToInsert = Object.entries(customValues)
      .filter(([_, v]) => v.trim() !== "")
      .map(([fieldId, value]) => ({ tenant_id: profile.tenant_id, product_id: product.id, field_id: fieldId, value }));
    if (valuesToInsert.length > 0) {
      await supabase.from("product_custom_values").insert(valuesToInsert);
    }

    // Save variations
    if (generatedVariations.length > 0) {
      const variationsToInsert = generatedVariations.map((v) => ({
        tenant_id: profile.tenant_id,
        product_id: product.id,
        sku: v.sku,
        variation_name: Object.entries(v.values).map(([, val]) => val).join(" / "),
        variation_values: v.values,
        price: v.price,
        cost: v.cost,
        stock_quantity: v.stock,
      }));
      await supabase.from("product_variations" as any).insert(variationsToInsert);
    }

    // Save channels
    if (channels.length > 0) {
      const channelsToInsert = channels.map((ch) => ({
        tenant_id: profile.tenant_id,
        product_id: product.id,
        channel_name: ch.channel_name,
        channel_sku: ch.channel_sku || null,
        channel_url: ch.channel_url || null,
        sync_enabled: ch.sync_enabled,
      }));
      await supabase.from("product_channels" as any).insert(channelsToInsert);
    }

    // Save SaaS child plans
    if (isSaas && saasPlans.length > 0) {
      for (const plan of saasPlans) {
        if (!plan.tier) continue;
        await supabase.from("products").insert({
          tenant_id: profile.tenant_id,
          sku: plan.sku,
          name: `${form.name} - ${plan.tier}`,
          type: "product",
          category: form.category || null,
          price: plan.price,
          cost: plan.cost,
          parent_id: product.id,
          is_parent: false,
          is_subscription: true,
          billing_cycle: plan.billing_cycle,
          plan_tier: plan.tier,
          setup_fee: plan.setup_fee,
          trial_days: plan.trial_days,
          annual_discount_percent: plan.annual_discount_percent,
        } as any);
      }
    }

    toast({ title: "Produto criado!" });
    setUploading(false);
    onSuccess();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Type Selector */}
      <div className="space-y-2">
        <Label>Tipo de Produto</Label>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setProductType(pt.value)}
              className={`text-left p-2.5 rounded-lg border transition-colors ${
                productType === pt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-sm font-medium">{pt.label}</p>
              <p className="text-xs text-muted-foreground">{pt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Image */}
      {visibleFields.includes("image") && (
        <div className="space-y-2">
          <Label>Imagem</Label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[100px]"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-24 rounded-md object-contain" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Clique para enviar imagem</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </div>
      )}

      {/* SKU + Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>SKU{skuRequired ? " *" : ""}</Label>
          <Input
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            required={skuRequired}
            placeholder={skuRequired ? "" : "Opcional – gerado automaticamente"}
          />
          {!skuRequired && (
            <p className="text-xs text-muted-foreground">
              ℹ SKU é opcional para esta categoria. Se vazio, será gerado automaticamente.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
      </div>

      {/* Category */}
      {visibleFields.includes("category") && (
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="none">Nenhuma</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Price + Cost */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preço</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={form.price}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.,]/g, "");
              setForm({ ...form, price: raw });
            }}
            required
          />
        </div>
        {visibleFields.includes("cost") && (
          <div className="space-y-2">
            <Label>Custo</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.cost}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.,]/g, "");
                setForm({ ...form, cost: raw });
              }}
            />
          </div>
        )}
      </div>

      {/* Description */}
      {visibleFields.includes("description") && (
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>
      )}

      {/* Variations */}
      {visibleFields.includes("variations") && (
        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-base font-semibold">Variações</Label>
          <VariationSelector configs={variationConfigs} onChange={setVariationConfigs} />
          <VariationPreview variations={generatedVariations} onChange={setGeneratedVariations} />
        </div>
      )}

      {/* Channels */}
      {visibleFields.includes("channels") && (
        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-base font-semibold">Canais de Venda</Label>
          <ChannelSelector channels={channels} onChange={setChannels} />
        </div>
      )}

      {/* SaaS Plans */}
      {visibleFields.includes("saas_plans") && (
        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-base font-semibold">Planos / SKUs Filhos</Label>
          <p className="text-xs text-muted-foreground">
            O produto pai funciona como container. Cada plano gera um SKU filho com preço e ciclo próprios.
          </p>
          <SaaSPlanEditor plans={saasPlans} onChange={setSaasPlans} baseSku={form.sku || "SAAS"} />
        </div>
      )}

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground">Campos Personalizados</p>
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1">
              <Label>{field.field_name}{field.is_required && " *"}</Label>
              {field.field_type === "select" ? (
                <Select value={customValues[field.id] || ""} onValueChange={(v) => setCustomValues({ ...customValues, [field.id]: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : field.field_type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <Switch checked={customValues[field.id] === "true"} onCheckedChange={(v) => setCustomValues({ ...customValues, [field.id]: v ? "true" : "false" })} />
                </div>
              ) : (
                <Input
                  type={field.field_type === "number" ? "number" : "text"}
                  value={customValues[field.id] || ""}
                  onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                  required={field.is_required}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dados Fiscais */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div>
          <Label className="text-base font-semibold">Dados Fiscais</Label>
          <p className="text-xs text-muted-foreground">Informações para emissão de NF-e/NFS-e (opcional para produto simples).</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>NCM</Label>
            <Input
              value={fiscal.ncm}
              onChange={(e) => setFiscal({ ...fiscal, ncm: e.target.value.replace(/\D/g, "").slice(0, 8) })}
              maxLength={8}
              placeholder="00000000"
            />
            <p className="text-[10px] text-muted-foreground">Nomenclatura Comum do Mercosul (8 dígitos)</p>
          </div>
          <div className="space-y-1">
            <Label>CFOP</Label>
            <Select value={fiscal.cfop} onValueChange={(v) => setFiscal({ ...fiscal, cfop: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5101">5101 — Venda de produção do estabelecimento</SelectItem>
                <SelectItem value="5102">5102 — Venda de mercadoria adquirida</SelectItem>
                <SelectItem value="5403">5403 — Venda de mercadoria com ST</SelectItem>
                <SelectItem value="5933">5933 — Prestação de serviço de comunicação</SelectItem>
                <SelectItem value="6101">6101 — Venda de produção (interestadual)</SelectItem>
                <SelectItem value="6102">6102 — Venda de mercadoria adquirida (interestadual)</SelectItem>
                <SelectItem value="6403">6403 — Venda de mercadoria com ST (interestadual)</SelectItem>
                <SelectItem value="outro">Outro (digitar)</SelectItem>
              </SelectContent>
            </Select>
            {fiscal.cfop === "outro" && (
              <Input
                value={fiscal.cfop_custom}
                onChange={(e) => setFiscal({ ...fiscal, cfop_custom: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="CFOP personalizado"
                className="mt-1"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label>CST / CSOSN</Label>
            <Input
              value={fiscal.cst}
              onChange={(e) => setFiscal({ ...fiscal, cst: e.target.value.replace(/\D/g, "").slice(0, 3) })}
              maxLength={3}
              placeholder="000"
            />
            <p className="text-[10px] text-muted-foreground">
              Simples Nacional usa CSOSN (3 dígitos: 102, 400). Regime Normal usa CST (2 dígitos: 00, 41).
            </p>
          </div>
          <div className="space-y-1">
            <Label>Unidade Fiscal</Label>
            <Select value={fiscal.unidade_fiscal} onValueChange={(v) => setFiscal({ ...fiscal, unidade_fiscal: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UN">UN (Unidade)</SelectItem>
                <SelectItem value="KG">KG (Quilograma)</SelectItem>
                <SelectItem value="L">L (Litro)</SelectItem>
                <SelectItem value="M">M (Metro)</SelectItem>
                <SelectItem value="M2">M² (Metro quadrado)</SelectItem>
                <SelectItem value="M3">M³ (Metro cúbico)</SelectItem>
                <SelectItem value="CX">CX (Caixa)</SelectItem>
                <SelectItem value="PC">PC (Peça)</SelectItem>
                <SelectItem value="outro">Outro (digitar)</SelectItem>
              </SelectContent>
            </Select>
            {fiscal.unidade_fiscal === "outro" && (
              <Input
                value={fiscal.unidade_custom}
                onChange={(e) => setFiscal({ ...fiscal, unidade_custom: e.target.value.toUpperCase().slice(0, 6) })}
                placeholder="Unidade personalizada"
                className="mt-1"
              />
            )}
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Origem ICMS</Label>
            <Select value={fiscal.origem_icms} onValueChange={(v) => setFiscal({ ...fiscal, origem_icms: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 — Nacional</SelectItem>
                <SelectItem value="1">1 — Estrangeira (importação direta)</SelectItem>
                <SelectItem value="2">2 — Estrangeira (mercado interno)</SelectItem>
                <SelectItem value="3">3 — Nacional com mais de 40% conteúdo estrangeiro</SelectItem>
                <SelectItem value="4">4 — Nacional via processos produtivos básicos</SelectItem>
                <SelectItem value="5">5 — Nacional com menos de 40% conteúdo estrangeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={uploading}>
        {uploading ? "Criando..." : "Criar Produto"}
      </Button>
    </form>
  );
}
