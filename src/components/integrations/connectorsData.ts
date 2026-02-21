
import { ConnectorDefinition } from "./connectorsCatalog";

// Additional connectors to reach 50+
export const ADDITIONAL_CONNECTORS: ConnectorDefinition[] = [
  // Communication
  { slug: "telegram", name: "Telegram", description: "Bot e mensagens via Telegram", type: "native", category: "communication", authType: "api_key", icon: "✈️", events: ["lead.created", "order.created"] },
  { slug: "discord", name: "Discord", description: "Notificações e bots no Discord", type: "native", category: "communication", authType: "webhook", icon: "🎮", events: ["deal.won", "order.created"] },
  { slug: "google-meet", name: "Google Meet", description: "Agende reuniões automaticamente", type: "native", category: "communication", authType: "oauth2", icon: "📹", events: ["deal.stage_changed", "lead.created"] },
  { slug: "email-smtp", name: "Email SMTP", description: "Envie emails via servidor SMTP próprio", type: "native", category: "communication", authType: "api_key", icon: "📮", events: ["lead.created", "deal.won", "order.created"] },

  // Payments
  { slug: "mercado-pago", name: "Mercado Pago", description: "Pagamentos via Mercado Pago", type: "native", category: "payment", authType: "api_key", icon: "💰", events: ["order.created", "order.paid"] },
  { slug: "pagseguro", name: "PagSeguro", description: "Cobranças e pagamentos PagSeguro", type: "native", category: "payment", authType: "api_key", icon: "💵", events: ["order.created", "order.paid"] },
  { slug: "square", name: "Square", description: "Pagamentos presenciais e online", type: "native", category: "payment", authType: "api_key", icon: "⬜", events: ["order.created", "order.paid"] },
  { slug: "wise", name: "Wise", description: "Transferências internacionais", type: "native", category: "payment", authType: "api_key", icon: "🌍", events: ["order.paid"] },

  // E-commerce
  { slug: "magento", name: "Magento", description: "Sincronize com lojas Magento", type: "native", category: "erp", authType: "api_key", icon: "🧡", events: ["product.updated", "order.created"] },
  { slug: "loja-integrada", name: "Loja Integrada", description: "Integração com Loja Integrada", type: "native", category: "erp", authType: "api_key", icon: "🏷️", events: ["product.updated", "order.created"] },
  { slug: "nuvemshop", name: "Nuvemshop", description: "Sincronize com Nuvemshop", type: "native", category: "erp", authType: "api_key", icon: "☁️", events: ["product.updated", "order.created", "order.paid"] },
  { slug: "bigcommerce", name: "BigCommerce", description: "Integração com BigCommerce", type: "native", category: "erp", authType: "api_key", icon: "🛍️", events: ["product.updated", "order.created"] },
  { slug: "amazon", name: "Amazon", description: "Venda e sincronize na Amazon", type: "native", category: "erp", authType: "oauth2", icon: "📦", events: ["product.updated", "order.created"] },
  { slug: "ebay", name: "eBay", description: "Venda e sincronize no eBay", type: "native", category: "erp", authType: "oauth2", icon: "🏷️", events: ["product.updated", "order.created"] },

  // Logistics
  { slug: "shopee", name: "Shopee", description: "Integração com marketplace Shopee", type: "native", category: "logistics", authType: "api_key", icon: "🧡", events: ["order.created", "order.paid"] },
  { slug: "olx", name: "OLX", description: "Publique e gerencie anúncios na OLX", type: "native", category: "logistics", authType: "api_key", icon: "📰", events: ["product.updated"] },
  { slug: "sedex", name: "Sedex / Correios", description: "Rastreio e cotação via Correios", type: "native", category: "logistics", authType: "api_key", icon: "📬", events: ["order.created"] },
  { slug: "loggi", name: "Loggi", description: "Entregas rápidas via Loggi", type: "native", category: "logistics", authType: "api_key", icon: "🏍️", events: ["order.created"] },
  { slug: "99cargo", name: "99Cargo", description: "Frete via 99Cargo", type: "native", category: "logistics", authType: "api_key", icon: "🚛", events: ["order.created"] },

  // Marketing
  { slug: "activecampaign", name: "ActiveCampaign", description: "Automação de marketing e CRM", type: "native", category: "marketing", authType: "api_key", icon: "📊", events: ["lead.created", "customer.created"] },
  { slug: "google-analytics", name: "Google Analytics", description: "Rastreie eventos e conversões", type: "native", category: "marketing", authType: "oauth2", icon: "📈", events: ["order.created", "lead.created"] },
  { slug: "facebook-ads", name: "Facebook Ads", description: "Sincronize leads e conversões", type: "native", category: "marketing", authType: "oauth2", icon: "📘", events: ["lead.created", "order.created"] },
  { slug: "google-ads", name: "Google Ads", description: "Rastreie conversões no Google Ads", type: "native", category: "marketing", authType: "oauth2", icon: "🔍", events: ["lead.created", "order.created"] },

  // Productivity
  { slug: "notion", name: "Notion", description: "Sincronize dados com Notion", type: "native", category: "productivity", authType: "api_key", icon: "📝", events: ["lead.created", "deal.won"] },
  { slug: "asana", name: "Asana", description: "Crie tarefas automaticamente no Asana", type: "native", category: "productivity", authType: "oauth2", icon: "🎯", events: ["deal.won", "order.created"] },
  { slug: "monday", name: "Monday.com", description: "Integração com Monday.com", type: "native", category: "productivity", authType: "api_key", icon: "📋", events: ["lead.created", "deal.won"] },
  { slug: "trello", name: "Trello", description: "Crie cards automaticamente no Trello", type: "native", category: "productivity", authType: "api_key", icon: "📌", events: ["lead.created", "deal.stage_changed"] },

  // Automation
  { slug: "ifttt", name: "IFTTT", description: "Automações simples com IFTTT", type: "native", category: "automation", authType: "webhook", icon: "🔀", events: ["lead.created", "deal.won", "order.created"] },
  { slug: "pabbly", name: "Pabbly", description: "Automação de workflows com Pabbly", type: "native", category: "automation", authType: "webhook", icon: "⚙️", events: ["lead.created", "deal.won", "order.created"] },

  // Accounting
  { slug: "neon", name: "Neon", description: "Integração bancária Neon", type: "native", category: "accounting", authType: "api_key", icon: "🟢", events: ["order.paid"] },
  { slug: "nubank", name: "Nubank", description: "Integração bancária Nubank", type: "native", category: "accounting", authType: "api_key", icon: "🟣", events: ["order.paid"] },
  { slug: "contabilizei", name: "Contabilizei", description: "Contabilidade automatizada", type: "native", category: "accounting", authType: "api_key", icon: "📒", events: ["order.created", "order.paid"] },
  { slug: "omie", name: "Omie", description: "ERP e contabilidade Omie", type: "native", category: "accounting", authType: "api_key", icon: "🔷", events: ["order.created", "product.updated"] },
];
