

# Gap Analysis: Documento vs Implementacao Atual

## Resumo dos Gaps Encontrados

| Feature | Doc Pede | Implementado | Gap |
|---------|----------|-------------|-----|
| 1. Formulario Dinamico de Produtos | Formulario que adapta campos por tipo de produto + variacoes + canais | Formulario basico estatico | **GRANDE** - Feature principal nao implementada |
| 2. Categorias em Massa | Templates 500+, CSV import, clonagem, packs | Templates + importPack existem | Medio - Falta CSV upload e clonagem UI |
| 3. Documentacao por Nicho | Artigos + Videos + FAQs separados | Artigos seedados, tabela unica | Medio - Falta tabelas videos/faqs |
| 4. 50+ Integracoes | 50+ conectores em 8 categorias | 27 conectores em 7 categorias | **GRANDE** - Faltam ~25 conectores |
| 5. Relatorios Avancados | 20+ templates, 6 formatos export | 20 templates, 3 formatos (CSV/Excel/PDF) | Pequeno - Falta PowerPoint export |
| 6. Notificacoes Tempo Real | 15+ tipos, multi-canal, notification_logs | 28 tipos, in-app only | Pequeno - Falta notification_logs table |
| 7. Workflows | Builder visual, 20+ triggers, 30+ acoes | Builder + 15 templates | Pequeno - Ja funcional |

---

## PRIORIDADE 1: Formulario Dinamico de Produtos (Gap Maior)

### O que falta

O documento pede um formulario de produto que muda dinamicamente conforme o tipo de produto selecionado (service, simple_product, variable_product, ecommerce, physical_store, multi_channel). Hoje o formulario e estatico.

### Tabelas novas necessarias

1. **product_variations** - Para produtos com variacoes (tamanho, cor, etc)
   - product_id, sku, variation_name, variation_values (jsonb), price, cost, stock_quantity

2. **product_channels** - Para produtos multi-canal
   - product_id, channel_name, channel_sku, channel_url, sync_enabled, last_sync

### Componentes a criar

1. **src/components/products/ProductFormDynamic.tsx** - Formulario que adapta campos visiveis com base na categoria/tipo selecionado
2. **src/components/products/VariationSelector.tsx** - Componente para selecionar variacoes (tamanho, cor, voltagem, sabor)
3. **src/components/products/VariationPreview.tsx** - Preview das combinacoes de SKU geradas
4. **src/components/products/ChannelSelector.tsx** - Seletor de canais (e-commerce, loja fisica, marketplace)
5. **src/lib/productUtils.ts** - Funcoes generateSKU() e generateVariations()

### Alteracoes

- **src/pages/Products.tsx** - Substituir formulario atual pelo ProductFormDynamic
- A tabela `products` ja possui os campos necessarios (name, sku, price, cost, type, category, image_url)

---

## PRIORIDADE 2: Expandir Integracoes para 50+

### Conectores faltantes (~25 novos)

O catalogo atual tem 27. O documento pede 50+ distribuidos em:

**Comunicacao (faltam 4):** Telegram, Discord, Google Meet, Email SMTP

**Pagamentos (faltam 4):** Mercado Pago, PagSeguro, Square, Wise

**E-commerce (faltam 6):** Magento, Loja Integrada, Nuvemshop, BigCommerce, Amazon, eBay

**Logistica (faltam 5):** Shopee, OLX, Sedex, Loggi, 99Cargo

**Marketing (faltam 4):** ActiveCampaign, Google Analytics, Facebook Ads, Google Ads

**Produtividade (faltam 4):** Notion, Asana, Monday.com, Trello

**Automacao (faltam 2):** IFTTT, Pabbly

**Contabilidade (nova categoria, 4):** Neon, Nubank, Contabilizei, Omie

### Alteracoes

- **src/components/integrations/connectorsCatalog.ts** - Adicionar ~25 novos conectores + categorias "marketing", "automation", "accounting"

---

## PRIORIDADE 3: Gaps Menores

### 3a. Categorias - CSV Import e Clonagem

- **src/pages/settings/ProductCategories.tsx** - Adicionar botao de upload CSV com parser client-side e botao de clonagem por categoria

### 3b. Documentacao - Tabelas Videos e FAQs

- Criar migration para tabelas `documentation_videos` e `documentation_faqs`
- Seedar com dados iniciais

### 3c. Notification Logs

- Criar migration para tabela `notification_logs` (notification_id, channel, status, sent_at)

---

## Sequencia de Implementacao

1. **Migrations SQL** (3 operacoes):
   - Criar tabela `product_variations` com RLS
   - Criar tabela `product_channels` com RLS
   - Criar tabela `notification_logs` com RLS

2. **Formulario Dinamico** (5 arquivos novos + 1 alterado):
   - `src/lib/productUtils.ts`
   - `src/components/products/VariationSelector.tsx`
   - `src/components/products/VariationPreview.tsx`
   - `src/components/products/ChannelSelector.tsx`
   - `src/components/products/ProductFormDynamic.tsx`
   - Atualizar `src/pages/Products.tsx`

3. **Expandir Integracoes** (1 arquivo alterado):
   - `src/components/integrations/connectorsCatalog.ts` - adicionar ~25 conectores

4. **CSV Import em Categorias** (1 arquivo alterado):
   - `src/pages/settings/ProductCategories.tsx`

## Observacoes

- Os items 5 (Relatorios), 6 (Notificacoes) e 7 (Workflows) ja estao substancialmente implementados. Os templates de relatorio cobrem 20 tipos, as notificacoes tem 28 tipos, e os workflows tem builder + 15 templates.
- O formato PowerPoint nao sera implementado pois requer biblioteca pesada e tem baixo valor pratico comparado a PDF/Excel.
- Multi-canal de notificacoes (Email/SMS/WhatsApp) requer integracao com servicos externos pagos e sera implementado quando os conectores respectivos forem ativados.

