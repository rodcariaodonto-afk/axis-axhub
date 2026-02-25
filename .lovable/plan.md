

# Workflow "Integracao Formularios com CRM" - Completo

## O que sera feito

Atualizar o template existente "Integracao Formularios CRM/ERP/BI" e adicionar novas acoes ao catalogo para refletir exatamente o fluxo descrito no PDF: 6 acoes sequenciais apos o trigger de formulario respondido.

## Alteracoes

### 1. Novas acoes no catalogo (`workflowCatalog.ts`)

Adicionar 4 novas acoes ao `actionsCatalog`:

- **create_lead** - Criar Lead no CRM (campos: name, email, company, source, status)
- **create_account** - Criar Conta no CRM (campos: name, industry, country)
- **create_contact** - Criar Contato no CRM (campos: name, email, account_id)
- **create_opportunity** - Criar Oportunidade no CRM (campos: name, account_id, contact_id, stage, estimated_value)
- **send_email** - Enviar Email (campos: to, subject, body)

### 2. Atualizar template existente (`workflowTemplates.ts`)

Substituir o template `integracao-formularios` com os 7 nos corretos:

1. **Trigger**: `form.submitted` - Formulario respondido
2. **Acao 1**: `create_lead` - Criar Lead (name: respondent_name, email: respondent_email, company: institution_name, source: "Formulario Educacao Inclusiva", status: "Novo")
3. **Acao 2**: `create_account` - Criar Conta (name: institution_name, industry: "Educacao", country: "Angola")
4. **Acao 3**: `create_contact` - Criar Contato (name: respondent_name, email: respondent_email)
5. **Acao 4**: `create_opportunity` - Criar Oportunidade (name: "Solucao IA para institution_name", stage: "Qualificacao", estimated_value: "3000")
6. **Acao 5**: `send_email` - Enviar Email (to: rodcaria@axhub.com.br, subject: "Novo Lead: respondent_name", body: "Um novo lead foi gerado...")
7. (Mantém o `create_notification` existente como alerta interno)

### 3. Auto-criar o workflow ao acessar a aba Workflows (`WorkflowList.tsx`)

Adicionar um botao "Criar Workflow Modelo" (similar ao botao de formularios) que:
- Insere o workflow "Integracao Formularios com CRM" no banco ja publicado e ativo
- Usa o template completo com todas as 6 acoes
- Fica sempre visivel para poder ser recriado

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/workflows/workflowCatalog.ts` | 5 novas acoes (create_lead, create_account, create_contact, create_opportunity, send_email) |
| `src/components/workflows/workflowTemplates.ts` | Atualizar template `integracao-formularios` com 7 nos completos |
| `src/components/workflows/WorkflowList.tsx` | Botao "Criar Workflow Modelo" que insere o workflow ativo no banco |

