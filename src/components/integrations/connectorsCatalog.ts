export interface ConnectorDefinition {
  slug: string;
  name: string;
  description: string;
  type: "zapier" | "make" | "native" | "webhook";
  category: "crm" | "erp" | "communication" | "payment" | "storage" | "productivity";
  authType: "oauth2" | "api_key" | "webhook";
  icon: string; // emoji
  events: string[];
}

export const CONNECTORS: ConnectorDefinition[] = [
  {
    slug: "zapier",
    name: "Zapier",
    description: "Conecte com milhares de apps via Zapier",
    type: "zapier",
    category: "productivity",
    authType: "webhook",
    icon: "⚡",
    events: ["lead.created", "deal.won", "order.created", "customer.created"],
  },
  {
    slug: "make",
    name: "Make (Integromat)",
    description: "Automações visuais avançadas",
    type: "make",
    category: "productivity",
    authType: "webhook",
    icon: "🔗",
    events: ["lead.created", "deal.won", "order.created", "customer.created"],
  },
  {
    slug: "n8n",
    name: "N8N",
    description: "Automação open-source self-hosted",
    type: "native",
    category: "productivity",
    authType: "api_key",
    icon: "🔧",
    events: ["lead.created", "lead.updated", "deal.won", "deal.lost", "order.created", "order.paid"],
  },
  {
    slug: "whatsapp",
    name: "WhatsApp API",
    description: "Envie e receba mensagens via WhatsApp",
    type: "native",
    category: "communication",
    authType: "api_key",
    icon: "💬",
    events: ["lead.created", "customer.created", "order.created"],
  },
  {
    slug: "gmail",
    name: "Gmail API",
    description: "Integre com Gmail para emails automatizados",
    type: "native",
    category: "communication",
    authType: "oauth2",
    icon: "📧",
    events: ["lead.created", "deal.won"],
  },
  {
    slug: "shopify",
    name: "Shopify",
    description: "Sincronize produtos e pedidos com Shopify",
    type: "native",
    category: "erp",
    authType: "api_key",
    icon: "🛒",
    events: ["product.updated", "order.created", "order.paid"],
  },
  {
    slug: "mercadolivre",
    name: "MercadoLivre",
    description: "Venda no MercadoLivre com sincronização",
    type: "native",
    category: "erp",
    authType: "oauth2",
    icon: "🏪",
    events: ["product.updated", "order.created"],
  },
  {
    slug: "slack",
    name: "Slack",
    description: "Notificações e alertas no Slack",
    type: "native",
    category: "communication",
    authType: "webhook",
    icon: "💼",
    events: ["deal.won", "deal.lost", "order.created", "lead.created"],
  },
  {
    slug: "stripe",
    name: "Stripe",
    description: "Processe pagamentos com Stripe",
    type: "native",
    category: "payment",
    authType: "api_key",
    icon: "💳",
    events: ["order.paid", "order.created"],
  },
  {
    slug: "hubspot",
    name: "HubSpot",
    description: "Sincronize leads e contatos com HubSpot",
    type: "native",
    category: "crm",
    authType: "api_key",
    icon: "🧲",
    events: ["lead.created", "lead.updated", "customer.created", "deal.won"],
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  all: "Todos",
  crm: "CRM",
  erp: "ERP",
  communication: "Comunicação",
  payment: "Pagamento",
  productivity: "Produtividade",
};
