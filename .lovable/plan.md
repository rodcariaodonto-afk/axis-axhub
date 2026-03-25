

## Etapa 3 — Dashboard SaaS + Métricas de Assinatura

### O que será feito

**1. Seção "Métricas SaaS" no Dashboard (`src/pages/Dashboard.tsx`)**
- Adicionar nova seção abaixo dos cards existentes (antes do gráfico de receitas)
- Consultar tabela `subscriptions` para calcular:
  - **MRR** (soma de `mrr` onde `status = 'active'`)
  - **ARR** (MRR × 12)
  - **Assinaturas Ativas** (count onde `status = 'active'`)
  - **Churn Rate** (count `canceled` no mês / total início do mês × 100)
- 4 KPI cards em linha com ícones diferenciados (Repeat, TrendingUp, CreditCard, UserMinus)
- Seção só aparece se houver pelo menos 1 subscription no banco

**2. Nenhuma alteração de banco** — todos os dados já existem na tabela `subscriptions` criada na Etapa 1

### Arquivos modificados
- `src/pages/Dashboard.tsx` — adicionar seção SaaS com 4 KPIs

### Nota
A página de detalhes do Produto Pai (`/products/:id`) mencionada no plano original pode ser implementada futuramente se necessário — por ora os planos já são visíveis via expansão na listagem de produtos.

