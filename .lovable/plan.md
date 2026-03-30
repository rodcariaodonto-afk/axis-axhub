

## Adicionar Datas de Pagamento nas Formas de Pagamento dos Pedidos

### O que será feito

**1. Migração SQL** — Adicionar coluna `due_date` na tabela `order_payments`:
- `due_date date` — data de vencimento da parcela/pagamento

**2. Interface de pagamento atualizada** (`src/pages/Orders.tsx`):

- Adicionar campo `first_due_date` (data inicial) no `PaymentEntry`
- Para **cartão de crédito**: mostrar apenas campo "Data 1ª parcela" — as demais datas são calculadas automaticamente (mês a mês) e salvas no banco
- Para **outros métodos** (PIX, boleto, transferência, dinheiro, débito):
  - Se parcelas = 1: mostrar campo "Data de pagamento"
  - Se parcelas > 1 (ex: boleto parcelado): mostrar "Data 1ª parcela" e gerar datas automaticamente

**3. Salvar no banco**:
- Ao criar pedido, para cada forma de pagamento com parcelas > 1, gerar N registros em `order_payments` (um por parcela), cada um com `due_date` calculada (primeira data + N meses)
- Para pagamento à vista (1 parcela), salvar 1 registro com a data informada

### Layout da seção de pagamento (atualizado)
```text
┌─────────────────┬────────────┬──────────┬──────────────┬───┐
│ Cartão Crédito  │ R$ 10000   │ 10x      │ 📅 15/04/2026│ 🗑 │
│ PIX             │ R$ 10000   │ —        │ 📅 01/04/2026│ 🗑 │
└─────────────────┴────────────┴──────────┴──────────────┴───┘
```

### Arquivos modificados
- Migração SQL (adicionar `due_date` em `order_payments`)
- `src/pages/Orders.tsx` — campo de data no formulário de pagamento + lógica de geração de parcelas com datas

### Detalhes técnicos
- Usar Popover + Calendar (Shadcn DatePicker) para o campo de data
- Ao salvar cartão 10x com data 15/04, gera 10 registros: 15/04, 15/05, 15/06... 15/01
- `PaymentEntry` ganha campo `first_due_date: string` (formato ISO date)

