

# Ajustes no Modulo de BI -- Dashboards Pre-Configurados e Automaticos

## Resumo

O documento solicita 4 ajustes principais para que o BI funcione de forma totalmente automatica, sem tela em branco, com dashboards pre-configurados e captura automatica de dados.

---

## 1. Completar Triggers de Captura Automatica (Migracao SQL)

Atualmente existem triggers apenas para `deals` e `contacts`. O documento pede triggers tambem para:
- **leads** (AFTER INSERT OR UPDATE)
- **receivables** (AFTER INSERT OR UPDATE)
- **payables** (AFTER INSERT OR UPDATE)
- **whatsapp_messages** (AFTER INSERT) -- se a tabela existir
- **orders** (AFTER INSERT OR UPDATE)

A funcao `handle_fact_events_trigger` ja trata essas tabelas no codigo, mas os triggers nao foram criados.

---

## 2. Expandir Dashboards Pre-Configurados (Migracao SQL)

Atualizar a funcao `create_default_bi_dashboards` para criar **4 dashboards** em vez de 2:

- **Visao Geral** (ja existe) -- Receita Total, Novos Contatos, Eventos por Mes, Receita por Mes
- **Analise de CRM** (ja existe) -- Negocios Ganhos, Taxa de Conversao, Vendas por Vendedor
- **Analise de ERP** (novo) -- Fluxo de Caixa, Contas a Receber vs Pagar
- **Analise de WhatsApp** (novo) -- Tempo Medio de Resposta, Conversas por Atendente

---

## 3. Ajustar BIDashboard.tsx (Frontend)

Modificacoes no componente React:

- Adicionar `useEffect` para auto-selecionar o dashboard marcado como `is_default` (prioridade) ou o primeiro da lista
- Melhorar o estado vazio: mostrar "Carregando dashboard..." quando dashboards existem mas ainda nao foram selecionados
- Remover a tela em branco "Crie seu primeiro dashboard"

---

## 4. Criar Edge Function `initialize-bi-dashboards`

Nova funcao em `supabase/functions/initialize-bi-dashboards/index.ts` que:
- Recebe `tenant_id` via POST
- Chama `create_default_bi_dashboards` via RPC
- Retorna sucesso/erro

---

## Detalhes Tecnicos

### Arquivos Modificados
- `src/components/bi/BIDashboard.tsx` -- useEffect para auto-selecao + melhor estado vazio

### Arquivos Criados
- `supabase/functions/initialize-bi-dashboards/index.ts` -- Edge function

### Migracao SQL
Uma unica migracao que:
1. Cria triggers faltantes (leads, receivables, payables, orders) com `IF NOT EXISTS` ou `DROP/CREATE`
2. Atualiza `create_default_bi_dashboards` com 4 dashboards e mais widgets

### Nota sobre adaptacao
O documento original usa `workspace_id` -- sera adaptado para `tenant_id` conforme padrao do projeto. A funcao recebe `(p_tenant_id, p_user_id)` como ja implementado.

