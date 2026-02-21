
export type ProductType = "service" | "simple_product" | "variable_product" | "ecommerce" | "physical_store" | "multi_channel";

export const PRODUCT_TYPES: { value: ProductType; label: string; description: string }[] = [
  { value: "service", label: "Serviço", description: "Serviço sem estoque físico" },
  { value: "simple_product", label: "Produto Simples", description: "Produto sem variações" },
  { value: "variable_product", label: "Produto com Variações", description: "Tamanhos, cores, etc." },
  { value: "ecommerce", label: "E-commerce", description: "Venda exclusiva online" },
  { value: "physical_store", label: "Loja Física", description: "Venda em ponto de venda" },
  { value: "multi_channel", label: "Multi-canal", description: "Venda em múltiplos canais" },
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
    default:
      return base;
  }
}
