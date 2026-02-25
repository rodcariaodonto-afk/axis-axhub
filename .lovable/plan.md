

# Corrigir Integração Formulário -> CRM, Oportunidades, BI e Email

## Problemas Encontrados

### 1. A função `process-form-response` NUNCA executa
O gatilho SQL `notify_form_response_created` usa `net.http_post` da extensão `pg_net`, mas:
- A extensão `pg_net` NAO esta instalada no banco
- As configuracoes `app.settings.supabase_url` e `app.settings.service_role_key` estao NULL
- O gatilho falha silenciosamente (tem EXCEPTION WHEN OTHERS) e os dados nunca sao processados

### 2. Colunas erradas na `process-form-response`
Mesmo se a funcao rodasse, ela falharia porque:
- **Notifications**: usa `user_id` e `type` mas a tabela tem `recipient_id` e `notification_type_id`
- **Opportunities**: usa `stage_id`, `source`, `notes` mas a tabela tem `stage` (texto), e NAO tem colunas `source` nem `notes`

### 3. Colunas erradas no `workflow-runner`
A execucao do workflow falha com erro "Could not find the 'company' column of 'leads'" porque:
- **create_lead**: insere `company` mas a tabela `leads` nao tem essa coluna
- **create_opportunity**: usa `stage_id`, `source`, `owner_user_id` mas deveria ser `stage` (texto) e `owner_id`

### 4. Workflow executado com trigger_data vazio
O workflow foi disparado manualmente sem dados, por isso `{{respondent_name}}` aparece literal na notificacao.

## Plano de Correção

### Passo 1 - Migracao: Instalar pg_net e configurar settings
```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER DATABASE postgres SET app.settings.supabase_url = 'https://dgybxarkvmaajfeesqdv.supabase.co';
```
NOTA: `ALTER DATABASE` nao e permitido em migracoes. Alternativa: reescrever o gatilho para usar a URL diretamente em vez de `current_setting`.

**Solucao real**: Reescrever a funcao `notify_form_response_created()` para usar a URL hardcoded do projeto em vez de `current_setting`, e instalar `pg_net`.

### Passo 2 - Migracao: Recriar funcao do gatilho com URL fixa
Recriar `notify_form_response_created()` com a URL do projeto escrita diretamente e a service role key obtida do vault ou como constante.

### Passo 3 - Corrigir `process-form-response` (Edge Function)
| Linha | Problema | Correcao |
|---|---|---|
| Notificacao (step 9) | `user_id`, `type` | `recipient_id`, `notification_type_id` |
| Oportunidade (step 6) | `stage_id`, `source`, `notes` | `stage` (nome do estagio como texto), remover `source` e `notes` |

### Passo 4 - Corrigir `workflow-runner` (Edge Function)
| Acao | Problema | Correcao |
|---|---|---|
| `create_lead` | Insere `company` | Remover campo `company` |
| `create_opportunity` | `stage_id`, `source`, `owner_user_id` | Usar `stage` (texto), remover `source`, usar `owner_id` |

### Alteracoes por arquivo

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Instalar `pg_net`, recriar funcao `notify_form_response_created` com URL fixa |
| `supabase/functions/process-form-response/index.ts` | Corrigir colunas de notifications e opportunities |
| `supabase/functions/workflow-runner/index.ts` | Remover `company` do create_lead, corrigir create_opportunity |

