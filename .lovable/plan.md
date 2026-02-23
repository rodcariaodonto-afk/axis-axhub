

# Integracao Total da Plataforma AXIS

## Resumo

O documento solicita a criacao de um ecossistema totalmente integrado entre CRM, ERP, Financeiro, WhatsApp e BI, com fluxos automaticos de dados entre os modulos. Parte da logica ja existe no codigo (ex: deal ganho cria pedido), mas falta a infraestrutura de banco de dados (foreign keys, triggers SQL) e algumas automacoes.

---

## O que ja existe vs. o que falta

### Ja implementado (no frontend):
- Deal ganho cria pedido automaticamente (CardDetailModal.tsx, linha 106-117)
- Pedido concluido cria conta a receber (Orders.tsx, linha 94-113)
- Pagamento de recebivel registra transacao bancaria (Receivables.tsx, linha 109-132)

### Falta implementar:
- **Foreign keys** entre tabelas (deal_id em orders/receivables, crm_contact_id em customers, payment_status em deals)
- **Triggers SQL** para automacao server-side (sincronizacao contato-cliente, criacao de recebivel a partir de pedido, atualizacao de status ao pagar)
- **Edge Functions** de API (create-lead, payment-webhook, get-order-status)
- **Atualizacao dos componentes** para exibir dados integrados (payment_status no deal, info do deal no pedido, relacionamentos no recebivel)

---

## Parte 1: Migracao SQL -- Relacionamentos e Triggers

Uma unica migracao que:

1. **Adiciona colunas de relacionamento:**
   - `orders.deal_id` (UUID, FK para deals)
   - `receivables.deal_id` (UUID, FK para deals)
   - `customers.crm_contact_id` (UUID, UNIQUE)
   - `deals.payment_status` (VARCHAR, default 'Pendente')

2. **Cria 4 triggers de sincronizacao:**
   - `on_contact_change` -- Contato CRM inserido/atualizado sincroniza com Customer ERP
   - `on_deal_won` -- Deal marcado como "won" cria pedido e customer automaticamente (server-side, complementando o frontend)
   - `on_order_created` -- Pedido criado gera conta a receber automaticamente
   - `on_receivable_paid` -- Recebivel pago atualiza status do pedido e do deal

---

## Parte 2: Edge Functions

3 novas edge functions:

1. **`create-lead`** -- API para criar leads via integracao externa (POST com name, email, phone, source, tenant_id)
2. **`payment-webhook`** -- Webhook para gateways de pagamento marcarem recebiveis como pagos (POST com receivable_id, payment_status)
3. **`get-order-status`** -- Consulta status de pedido com dados relacionados (GET com ?id=)

---

## Parte 3: Atualizacao dos Componentes React

1. **CardDetailModal.tsx** -- Atualizar `markWon` para salvar `deal_id` no pedido criado e usar `crm_contact_id` para vincular o customer
2. **Orders.tsx** -- Exibir nome do deal relacionado na tabela (join com deals); salvar `deal_id` ao criar recebivel
3. **Receivables.tsx** -- Exibir deal e pedido relacionados na tabela (joins expandidos)
4. **Pipeline.tsx / KanbanCard.tsx** -- Exibir badge de `payment_status` nos cards de deal

---

## Detalhes Tecnicos

### Arquivos criados:
- `supabase/functions/create-lead/index.ts`
- `supabase/functions/payment-webhook/index.ts`
- `supabase/functions/get-order-status/index.ts`

### Arquivos modificados:
- `src/components/kanban/CardDetailModal.tsx` -- vincular deal_id ao pedido, usar crm_contact_id
- `src/pages/Orders.tsx` -- join com deals, exibir deal na tabela, salvar deal_id no recebivel
- `src/pages/Receivables.tsx` -- joins expandidos, exibir deal e pedido
- `src/components/kanban/KanbanCard.tsx` -- exibir payment_status badge

### Migracao SQL:
- ALTER TABLE para colunas faltantes (deal_id, crm_contact_id, payment_status)
- CREATE OR REPLACE FUNCTION para 4 funcoes de sincronizacao
- CREATE TRIGGER para 4 gatilhos automaticos
- Adaptacao para usar `tenant_id` (padrao do projeto) em vez de `workspace_id`
- Usar `estimated_value` (nome real da coluna) em vez de `value` do documento
- Status "won" (padrao do codigo) em vez de "Ganho" do documento

### Nota sobre conflito frontend/backend:
Os triggers SQL vao complementar a logica ja existente no frontend. O frontend continuara funcionando, e os triggers servem como safety net server-side + suporte a integracoes externas (webhooks, APIs).

