

## Etapa 2 — Contratos com Assinatura + Motor de Billing

### O que será feito

**1. Contrato tipo "Assinatura" (`src/pages/Contracts.tsx`)**
- Adicionar "Assinatura" ao array `typeOptions`
- Quando `contract_type === "Assinatura"`, mostrar seção condicional "Itens da Assinatura":
  - Dropdown de Produto SaaS (filtrar `products` onde `is_parent = true`)
  - Dropdown de Plano/SKU (filtrar `products` onde `parent_id = produto selecionado`)
  - Auto-preencher: ciclo, valor, setup fee a partir do plano selecionado
  - Campos: auto_renew (switch), trial_days (herdado do plano)
- Ao salvar contrato tipo Assinatura:
  - Salvar contrato com `contract_type_extended = 'subscription'`, `auto_renew`, `next_billing_date`, `mrr`
  - Criar registro em `subscriptions` vinculado ao contrato
- Coluna MRR na listagem de contratos
- Badge "Assinatura" diferenciado

**2. Edge Function `generate-recurring-invoices`**
- Nova edge function que:
  - Consulta `subscriptions` com status `active` e `next_billing_date <= hoje + 5 dias`
  - Para cada, verifica duplicata em `receivables` (mesmo `subscription_id` + `billing_period_start`)
  - Gera `receivable` com `is_recurring = true`, `subscription_id`, `billing_period_start/end`
  - Atualiza `next_billing_date` na subscription (avança 1 ciclo)
- `verify_jwt = false` no config.toml

**3. Botão "Gerar Faturas Recorrentes" (`src/pages/Receivables.tsx`)**
- Adicionar botão ao lado de "Nova Conta" que invoca a edge function
- Mostrar toast com resultado (quantas faturas geradas)

### Arquivos modificados
- `src/pages/Contracts.tsx` — tipo Assinatura + seção condicional + salvar subscription + coluna MRR
- `src/pages/Receivables.tsx` — botão gerar faturas recorrentes
- `supabase/functions/generate-recurring-invoices/index.ts` — nova edge function
- `supabase/config.toml` — entrada para a nova function

