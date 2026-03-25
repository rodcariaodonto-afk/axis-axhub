

## Implementação de Product Family + Billing SaaS no ERP AXIS

Este é um projeto grande. Para economizar créditos, vamos dividir em **3 etapas sequenciais**, cada uma aprovada separadamente.

---

### ETAPA 1 — Banco de Dados + Tipo SaaS no Cadastro de Produtos

**Migração SQL (1 migration):**
- `products`: ADD COLUMN `parent_id`, `is_parent`, `is_subscription`, `billing_cycle`, `plan_tier`, `setup_fee`, `trial_days`, `annual_discount_percent`, `gross_margin` (generated)
- `contracts`: ADD COLUMN `contract_type_extended`, `auto_renew`, `next_billing_date`, `mrr`
- `receivables`: ADD COLUMN `subscription_id`, `is_recurring`, `billing_period_start`, `billing_period_end`
- CREATE TABLE `subscriptions` (com RLS tenant-based)
- Índices para hierarquia de produtos

**UI — Formulário de Produto (ProductFormDynamic.tsx + productUtils.ts):**
- Adicionar 7o tipo "SaaS / Assinatura" com ícone 🔄
- Quando selecionado: formulário em 2 seções (Produto Pai + Planos/SKUs Filhos)
- Cada plano: Nome do Tier, SKU auto-gerado, Ciclo, Preço, Custo, Margem (calculada), Setup Fee, Desconto Anual, Trial
- Salvar: Produto Pai (is_parent=true, sem preço) + N SKUs Filhos (parent_id apontando pro pai)

**UI — Listagem de Produtos (Products.tsx):**
- Produtos Pai com chevron expansível, sub-linhas indentadas para SKUs filhos
- Coluna Preço do Pai: "A partir de R$ X"
- Badge "SaaS" diferenciado

### ETAPA 2 — Contratos com Assinatura + Motor de Billing

**UI — Contratos (Contracts.tsx):**
- Novo tipo "Assinatura" no dropdown
- Seção condicional "Itens da Assinatura": selecionar produto SaaS → selecionar plano → auto-preencher ciclo/valor/setup
- Criar registro em `subscriptions` ao salvar
- Badge e coluna MRR na listagem

**Edge Function — `generate-recurring-invoices`:**
- Consulta subscriptions ativas com next_billing_date <= hoje + 5 dias
- Gera receivables evitando duplicatas
- Atualiza next_billing_date

**UI — Receivables.tsx:**
- Botão "Gerar Faturas Recorrentes" invocando a edge function

### ETAPA 3 — Dashboard SaaS + Detalhes do Produto Pai

**Dashboard (Dashboard.tsx):**
- Seção "Métricas SaaS": MRR, ARR, Assinaturas Ativas, Churn Rate, Margem Bruta Média

**Página de Detalhes do Produto Pai (/products/:id):**
- Info geral + tabela de planos + KPIs (Total Planos, Assinaturas Ativas, MRR)
- Botões Adicionar/Editar plano

---

### Regras de Negócio (aplicadas ao longo das etapas)
- Produto Pai não pode ser vendido diretamente
- Exclusão de Pai bloqueada se houver assinaturas ativas
- Produtos SaaS ocultos do módulo de Estoque
- SKU único no padrão PREFIXO-TIER-CICLO

### Arquivos modificados (total)
- 1 migração SQL (todas as tabelas de uma vez)
- `src/lib/productUtils.ts` — novo tipo SaaS + campos visíveis
- `src/components/products/ProductFormDynamic.tsx` — formulário SaaS
- `src/pages/Products.tsx` — listagem com accordion + detalhes
- `src/pages/Contracts.tsx` — tipo Assinatura + seção itens
- `src/pages/Receivables.tsx` — botão gerar faturas
- `src/pages/Dashboard.tsx` — seção métricas SaaS
- `supabase/functions/generate-recurring-invoices/index.ts` — edge function

### Estratégia para economizar créditos
Implementaremos tudo na **Etapa 1** primeiro (DB + formulário + listagem), que é a base. Depois Etapa 2 e 3 em mensagens seguintes. Nenhuma funcionalidade existente será alterada — tudo é extensão aditiva.

Deseja aprovar para começarmos pela Etapa 1?

