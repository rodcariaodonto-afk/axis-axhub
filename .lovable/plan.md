## Problema

Hoje, em **ERP → Pedidos**, cada pedido só aceita **um único bloco de cobrança total** (parcelado em N vezes). Para vender "Setup R$ 2.000 em 10x + Mensalidade R$ 120/mês recorrente" o usuário precisa criar **2 pedidos separados**, o que polui o histórico, quebra relatórios por cliente e dificulta o vínculo comercial.

## Solução proposta

Permitir que **um único Pedido** contenha **dois tipos de cobrança simultâneos**:

1. **Cobrança Única (Setup / pontual)** — valor fixo, podendo ser parcelado.
2. **Cobrança Recorrente (Mensalidade / Assinatura)** — valor mensal contínuo, gerado automaticamente todo mês via o motor de assinaturas que já existe (`subscriptions` + edge `generate-recurring-invoices`).

O usuário monta os dois blocos no mesmo modal, vê um resumo claro ("Setup: R$ 2.000 em 10x cartão + Mensal: R$ 120/mês PIX") e o sistema gera tudo: recebíveis do setup + assinatura ativa para a mensalidade.

## Como ficará a UX (modal "Novo Pedido")

```text
┌─ Novo Pedido ─────────────────────────────────┐
│ Cliente: [ Acme Ltda ▾ ]                      │
│ Itens:   [+ adicionar produto]                │
│   • Plataforma AXHUB (1x) ............. R$ 0  │
│                                                │
│ ┌─ Cobrança ─────────────────────────────────┐│
│ │ [✓] Setup / Cobrança única                 ││
│ │     Valor: R$ 2.000,00                     ││
│ │     Forma: [Cartão ▾]  Parcelas: [10x]     ││
│ │     1ª venc.: [05/06/2026]                 ││
│ │                                            ││
│ │ [✓] Mensalidade recorrente                 ││
│ │     Valor: R$ 120,00 / mês                 ││
│ │     Forma:  [PIX ▾]                        ││
│ │     Início: [05/06/2026]                   ││
│ │     Duração: ( ) Indeterminada             ││
│ │              (•) Por X meses [12]          ││
│ └────────────────────────────────────────────┘│
│ Resumo: Setup R$ 2.000 (10x cartão) + R$ 120/mês PIX │
│                            [Cancelar] [Criar]│
└────────────────────────────────────────────────┘
```

Pelo menos um dos dois blocos precisa estar marcado. Se só Setup → comportamento idêntico ao de hoje.

## O que vai acontecer no backend ao criar

1. **`orders`** — 1 registro com `total = setup_total` (recorrente não entra no total do pedido, fica em campo separado para BI).
2. **`order_payments`** — N parcelas do Setup (já funciona hoje).
3. **`receivables`** — N recebíveis do Setup vinculados ao `order_id` (já funciona hoje).
4. **`subscriptions`** — 1 nova assinatura ativa (`status='active'`, `price=120`, `billing_cycle='mensal'`, `next_billing_date=início`, `order_id=<novo>`) para a parte recorrente.
5. A edge function `generate-recurring-invoices` (que já roda) passa a gerar o recebível mensal de R$ 120 automaticamente, sem nova infra.

## Mudanças técnicas (resumo para devs)

**Frontend — `src/pages/Orders.tsx`**
- Substituir o array único `payments` por 2 estados: `setupPayment` (opcional, mesma estrutura atual) e `recurringPayment` (`{ amount, method, start_date, duration_months | null }`).
- Atualizar `handleCreate`: criar order com `total = setup_total`; gerar `order_payments` + `receivables` só para setup; se `recurringPayment` ativo, inserir em `subscriptions`.
- Listagem: mostrar badge "Recorrente" nos pedidos que têm assinatura vinculada (ícone de loop ao lado do número).
- Validação: ao menos um bloco ativo; se só recorrente, total do pedido = 0 e itens são opcionais (ou exigir um produto-âncora).

**Backend — migração leve**
- Adicionar coluna `subscriptions.order_id uuid REFERENCES orders(id)` (nullable, indexada) para vincular assinatura ao pedido de origem.
- Adicionar `orders.recurring_amount numeric DEFAULT 0` e `orders.recurring_method text` para visibilidade no BI/listagem (não afeta `total`).
- Nenhuma mudança em `generate-recurring-invoices` — ela já lê `subscriptions` e gera recebíveis.

**Compatibilidade**
- Pedidos antigos continuam funcionando (campos novos default 0/null).
- A função `on_deal_won` (trigger que cria pedido a partir de deal ganho) não é afetada.

## Pontos a confirmar antes de implementar

1. **Itens (produtos) do pedido recorrente:** quando o cliente assina só mensalidade, ainda é obrigatório selecionar um produto da lista, ou o pedido pode ser "vazio de itens" e usar apenas a descrição da mensalidade?
2. **Faixa do recorrente no `total` do pedido:** mantenho `total = só setup` (recomendado, evita inflar receita à vista) ou prefere `total = setup + (mensal × meses)` para projeções comerciais?
3. **Duração padrão da mensalidade:** indeterminada (até cancelar) ou sempre exigir prazo em meses?
