

# Corrigir Workflow Runner - Ações CRM e Bug de Execução

## Problema

O workflow "Integração Formulários com CRM" falha com erro 500 porque:

1. Linha com `supabase.rpc("", {}).catch(() => {})` causa erro fatal: o retorno do Supabase SDK não tem `.catch()` direto
2. As 5 novas ações (`create_lead`, `create_account`, `create_contact`, `create_opportunity`, `send_email`) não estão implementadas no `executeAction()` do backend - apenas existem no catálogo do frontend

## Alterações

### Arquivo: `supabase/functions/workflow-runner/index.ts`

1. **Remover a linha quebrada** do `supabase.rpc("", {}).catch(() => {})` (linha ~89) - era um placeholder sem utilidade

2. **Adicionar 5 novos cases no `executeAction()`**:

   - **`create_lead`**: Insere na tabela `leads` com campos name, email, company, source, status
   - **`create_account`**: Insere na tabela `crm_accounts` com campos name, segment/industry, country
   - **`create_contact`**: Insere na tabela `contacts` com campos first_name, last_name, email, account_id
   - **`create_opportunity`**: Busca o primeiro estágio de oportunidade e insere na tabela `opportunities` com name, amount, stage_id, source
   - **`send_email`**: Usa a API do Resend (via secret `RESEND_API_KEY`) para enviar email com campos to, subject, body

3. **Resolver templates de variáveis**: As configurações usam `{{respondent_name}}`, `{{respondent_email}}`, etc. Adicionar uma função auxiliar `resolveTemplate()` que substitui essas variáveis pelos valores do `trigger_data`

## Detalhes técnicos

### Resolução de variáveis
```text
Entrada: "Olá {{respondent_name}}"
trigger_data: { respondent_name: "João" }
Saída: "Olá João"
```

### Fluxo corrigido
```text
Trigger (form.submitted)
  -> create_lead (INSERT leads)
  -> create_account (INSERT crm_accounts)
  -> create_contact (INSERT contacts)
  -> create_opportunity (INSERT opportunities)
  -> send_email (Resend API)
  -> create_notification (INSERT notifications)
```

| Arquivo | Mudança |
|---|---|
| `supabase/functions/workflow-runner/index.ts` | Remover bug do rpc, adicionar 5 action handlers, adicionar resolveTemplate() |

