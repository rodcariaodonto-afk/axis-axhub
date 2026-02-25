

# Integracaco Formularios com CRM, ERP e BI

## Objetivo
Criar uma automacao completa que, ao receber uma resposta de formulario (`form_responses`), automaticamente:
1. Extrai e formata os dados da resposta
2. Cria/atualiza um **Lead** no CRM
3. Cria uma **Conta** (Account) no CRM
4. Cria um **Contato** vinculado a conta
5. Cria uma **Oportunidade** no ERP
6. Cria uma **Atividade** (tarefa de follow-up)
7. Insere dados analiticos no BI (`bi_form_data`)
8. Envia notificacao para o responsavel

## Arquitetura

```text
form_responses INSERT
       |
       v
 DB Trigger (after insert)
       |
       v
 Edge Function: process-form-response
       |
       +---> Extrair dados do JSONB response_data
       +---> Verificar lead existente (por email)
       +---> INSERT/UPDATE lead
       +---> INSERT crm_accounts
       +---> INSERT contacts (vinculado a account)
       +---> INSERT opportunities (com valor estimado)
       +---> INSERT activities (tarefa para Rodrigo)
       +---> INSERT bi_form_data
       +---> INSERT notifications (alerta para responsavel)
```

## Etapas de Implementacao

### 1. Migracao de banco de dados
- Criar tabela `bi_form_data` com campos para dados analiticos do formulario (institution_name, country, students counts, special_needs info, investment capacity, lead_id, account_id, opportunity_id, etc.)
- RLS baseada em `tenant_id` usando `get_user_tenant_id()`
- Criar trigger na tabela `form_responses` que chama a Edge Function via `pg_net` (HTTP POST) ao inserir nova resposta

### 2. Edge Function: `process-form-response`
Funcao backend que recebe o `form_response_id` e executa toda a cadeia:
- Busca a resposta e seu formulario pai
- Extrai campos do JSONB `response_data` mapeando para variaveis (respondent_name, email, institution, etc.)
- Verifica se ja existe lead com mesmo email -- se sim, atualiza; se nao, cria novo
- Cria conta em `crm_accounts` com nome da instituicao
- Cria contato em `contacts` vinculado a conta
- Cria oportunidade em `opportunities` com valor estimado baseado na capacidade de investimento
- Cria atividade em `activities` com prazo de 3 dias
- Insere registro em `bi_form_data` para analytics
- Cria notificacao para o usuario responsavel
- Trata erros em cada passo com logging

### 3. Template de Workflow no builder
- Adicionar trigger `form.submitted` no catalogo de triggers do Workflow Builder
- Adicionar template pre-construido "Integracao Formularios CRM/ERP/BI" na categoria "vendas"
- Permitir que usuarios visualizem e customizem o fluxo

### 4. Config do Supabase
- Registrar a Edge Function em `config.toml` com `verify_jwt = false` (sera chamada internamente via trigger)
- Usar `SUPABASE_SERVICE_ROLE_KEY` para operacoes de banco dentro da funcao

## Detalhes Tecnicos

**Mapeamento de campos do formulario**: A funcao extraira dados do campo `response_data` (JSONB) usando as labels das perguntas como chave, baseado no formulario modelo de Educacao Inclusiva ja criado.

**Calculo do valor estimado**: Baseado no campo `investment_capacity`:
- "Significativo" = R$ 5.000
- "Moderado" = R$ 3.000
- "Pequeno" = R$ 1.000

**Trigger via pg_net**: O trigger no banco fara um HTTP POST para a Edge Function, passando o ID da resposta. Isso garante processamento assincrono sem bloquear a insercao.

**Tratamento de erros**: Cada passo sera executado em sequencia com try/catch. Erros serao registrados em log e uma notificacao de erro sera enviada se algo falhar.

