
export type ProductType = "service" | "simple_product" | "variable_product" | "ecommerce" | "physical_store" | "multi_channel" | "saas";

export const PRODUCT_TYPES: { value: ProductType; label: string; description: string }[] = [
  { value: "service", label: "Serviço", description: "Serviço sem estoque físico" },
  { value: "simple_product", label: "Produto Simples", description: "Produto sem variações" },
  { value: "variable_product", label: "Produto com Variações", description: "Tamanhos, cores, etc." },
  { value: "ecommerce", label: "E-commerce", description: "Venda exclusiva online" },
  { value: "physical_store", label: "Loja Física", description: "Venda em ponto de venda" },
  { value: "multi_channel", label: "Multi-canal", description: "Venda em múltiplos canais" },
  { value: "saas", label: "SaaS / Assinatura", description: "Produto recorrente com planos" },
];

export const VARIATION_TYPES = [
  { value: "size", label: "Tamanho", options: ["PP", "P", "M", "G", "GG", "XG"] },
  { value: "color", label: "Cor", options: ["Preto", "Branco", "Azul", "Vermelho", "Verde", "Amarelo"] },
  { value: "voltage", label: "Voltagem", options: ["110V", "220V", "Bivolt"] },
  { value: "flavor", label: "Sabor", options: ["Chocolate", "Morango", "Baunilha", "Limão"] },
  { value: "material", label: "Material", options: ["Algodão", "Poliéster", "Couro", "Metal", "Madeira"] },
  { value: "weight", label: "Peso", options: ["250g", "500g", "1kg", "2kg", "5kg"] },
];

export const CHANNELS = [
  { value: "ecommerce", label: "E-commerce", icon: "🛒" },
  { value: "physical_store", label: "Loja Física", icon: "🏪" },
  { value: "marketplace", label: "Marketplace", icon: "🏬" },
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
  { value: "social_media", label: "Redes Sociais", icon: "📱" },
];

export interface VariationConfig {
  type: string;
  values: string[];
}

export interface GeneratedVariation {
  sku: string;
  name: string;
  values: Record<string, string>;
  price: number;
  cost: number;
  stock: number;
}

export function generateSKU(baseSku: string, variationValues: Record<string, string>): string {
  const suffix = Object.values(variationValues)
    .map((v) => v.substring(0, 3).toUpperCase().replace(/\s/g, ""))
    .join("-");
  return `${baseSku}-${suffix}`;
}

export function generateVariations(
  baseSku: string,
  baseName: string,
  basePrice: number,
  baseCost: number,
  configs: VariationConfig[]
): GeneratedVariation[] {
  if (configs.length === 0) return [];

  const combine = (index: number, current: Record<string, string>): Record<string, string>[] => {
    if (index >= configs.length) return [{ ...current }];
    const results: Record<string, string>[] = [];
    for (const val of configs[index].values) {
      results.push(...combine(index + 1, { ...current, [configs[index].type]: val }));
    }
    return results;
  };

  return combine(0, {}).map((values) => {
    const label = Object.entries(values)
      .map(([k, v]) => {
        const type = VARIATION_TYPES.find((t) => t.value === k);
        return `${type?.label || k}: ${v}`;
      })
      .join(" / ");
    return {
      sku: generateSKU(baseSku, values),
      name: `${baseName} - ${label}`,
      values,
      price: basePrice,
      cost: baseCost,
      stock: 0,
    };
  });
}

export function getVisibleFields(type: ProductType) {
  const base = ["sku", "name", "price", "image"];
  switch (type) {
    case "service":
      return [...base, "description"];
    case "simple_product":
      return [...base, "cost", "stock", "category"];
    case "variable_product":
      return [...base, "cost", "stock", "category", "variations"];
    case "ecommerce":
      return [...base, "cost", "stock", "category", "description", "weight", "dimensions"];
    case "physical_store":
      return [...base, "cost", "stock", "category", "barcode"];
    case "multi_channel":
      return [...base, "cost", "stock", "category", "variations", "channels"];
    case "saas":
      return [...base, "category", "description", "saas_plans"];
    default:
      return base;
  }
}

export const BILLING_CYCLES = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

export interface SaaSPlan {
  tier: string;
  sku: string;
  billing_cycle: string;
  price: number;
  cost: number;
  setup_fee: number;
  trial_days: number;
  annual_discount_percent: number;
}

export function generatePlanSKU(baseSku: string, tier: string, cycle: string): string {
  const t = tier.substring(0, 4).toUpperCase().replace(/\s/g, "");
  const c = cycle.substring(0, 3).toUpperCase();
  return `${baseSku}-${t}-${c}`;
}

// Categories/types where SKU is optional
const SKU_OPTIONAL_CATEGORIES = [
  "consultoria", "consultório", "clínica", "aula", "treinamento", "coaching",
  "design gráfico", "web design", "fotografia", "vídeo", "assessoria", "auditoria",
  "curso", "educação", "imóvel", "imóveis", "real estate",
  "consultoria empresarial", "consultoria financeira", "consultoria de marketing",
  "consultoria de rh", "consultoria de ti", "consultoria tributária",
  "consultório médico", "consultório odontológico", "consultório psicológico",
  "clínica geral", "aula de inglês", "aula de música", "aula de dança",
  "treinamento corporativo", "serviço", "serviços", "software",
];

export function isSKURequired(productType: ProductType, category: string, hasVariations: boolean): boolean {
  // If product has variations, SKU is always required
  if (hasVariations || productType === "variable_product") return true;
  // Services never require SKU
  if (productType === "service") return false;
  // Check if category is in the optional list
  const lowerCat = (category || "").toLowerCase().trim();
  if (SKU_OPTIONAL_CATEGORIES.some((c) => lowerCat.includes(c) || c.includes(lowerCat))) return false;
  // Default: required for products
  return true;
}

export function generateAutoSKU(category: string, productName: string): string {
  const catPrefix = (category || "GEN").substring(0, 3).toUpperCase().replace(/\s/g, "");
  const namePrefix = (productName || "PRD").substring(0, 3).toUpperCase().replace(/\s/g, "");
  const timestamp = Date.now().toString().slice(-4);
  return `${catPrefix}-${namePrefix}-${timestamp}`;
}
