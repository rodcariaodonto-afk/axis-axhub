# Especificação: Recorrência em Contas a Pagar — AXIS CRM

## 1. Visão Geral
- **Objetivo:** Permitir que contas a pagar sejam criadas como recorrentes (mensal, semanal, diária), gerando automaticamente novas contas no vencimento e refletindo na projeção de fluxo de caixa.
- **Público-Alvo:** Usuários do módulo Financeiro do AXIS que precisam lançar despesas recorrentes (aluguel, salários, assinaturas).

## 2. Requisitos Funcionais

### 2.1 Formulário de Nova Conta
- O formulário deve manter 100% do comportamento atual para contas únicas
- Adicionar toggle "Tornar conta recorrente" abaixo do campo Categoria
- Ao ativar, exibir painel de configuração com:
  - Frequência: Mensal / Semanal / Diária
  - Intervalo: número de unidades (ex: a cada 2 meses)
  - Data de término (opcional)

### 2.2 Submissão
- Conta única → fluxo atual mantido intacto
- Conta recorrente → criar conta inicial + registro de recorrência atomicamente

### 2.3 Geração Automática
- Edge Function diária (cron) processa recorrências ativas
- Cria nova conta a pagar quando `next_generation_date <= hoje`
- Avança `next_generation_date` para próximo ciclo

### 2.4 Listagem
- Contas geradas por recorrência exibem badge "Recorrente"
- Contas template podem ser identificadas visualmente

### 2.5 Fluxo de Caixa
- Projeção considera contas geradas + contas virtuais futuras das recorrências ativas

## 3. Regras de Negócio

- Cada recorrência tem uma conta template (`is_recurring_template = true`)
- Status de recorrência: `active`, `paused`, `cancelled`
- Cancelar recorrência não afeta contas já geradas
- Cálculo de próxima data:
  - **Mensal:** somar N meses, ajustar para último dia do mês se necessário (31/01 + 1m → 28/02 ou 29/02)
  - **Semanal:** somar N × 7 dias
  - **Diária:** somar N dias
- Recorrência sem `end_date` é infinita (gera enquanto status = active)

## 4. Requisitos Não Funcionais

- **Atomicidade:** Criação de conta + recorrência via RPC PostgreSQL (transação única)
- **Auditoria:** Toda criação/alteração registrada em `audit_logs` com `actor_user_id`
- **Performance:** Geração diária via cron, não bloqueia interface
- **RLS:** Tabela `payment_recurrences` com policy por `tenant_id`

## 5. Casos Extremos

- 31/01 + 1 mês → último dia válido (28 ou 29/02)
- Recorrência com `end_date < next_generation_date` → marcar como `cancelled`
- Conta template deletada → recorrências vinculadas marcadas como `cancelled`
- Cron rodando 2x no mesmo dia → idempotência via `next_generation_date`

## 6. Critérios de Aceite (BDD)

**Dado que** o usuário cria uma conta a pagar marcando como recorrente mensal,  
**quando** salva,  
**então** a conta é criada e um registro em `payment_recurrences` é gerado.

**Dado que** existe uma recorrência ativa com `next_generation_date = hoje`,  
**quando** o cron diário executa,  
**então** uma nova conta é criada e a `next_generation_date` é avançada.

**Dado que** uma recorrência tem `end_date < hoje`,  
**quando** o cron executa,  
**então** o status muda para `cancelled` e nenhuma conta é gerada.

**Dado que** o usuário consulta o fluxo de caixa para os próximos 6 meses,  
**quando** existem recorrências ativas,  
**então** a projeção inclui as contas virtuais que ainda não foram geradas.
