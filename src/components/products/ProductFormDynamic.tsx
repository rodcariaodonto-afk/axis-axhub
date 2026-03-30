
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

export default function ProductFormDynamic({ categories, customFields, onSuccess, onClose }: ProductFormDynamicProps) {
  const [productType, setProductType] = useState<ProductType>("simple_product");
  const [form, setForm] = useState({ sku: "", name: "", price: "", cost: "", category: "", description: "" });
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
      const vars = generateVariations(form.sku, form.name, parseFloat(form.price) || 0, parseFloat(form.cost) || 0, variationConfigs);
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

    const { data: product, error } = await supabase.from("products").insert({
      tenant_id: profile.tenant_id,
      sku: finalSku,
      name: form.name,
      type: dbType,
      category: form.category || null,
      price: isSaas ? 0 : (parseFloat(form.price) || 0),
      cost: isSaas ? 0 : (parseFloat(form.cost) || 0),
      is_parent: isSaas,
      is_subscription: isSaas,
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

      <Button type="submit" className="w-full" disabled={uploading}>
        {uploading ? "Criando..." : "Criar Produto"}
      </Button>
    </form>
  );
}
