

# Completar Refatoracao Salesforce - O Que Falta

## Analise: O Que Ja Existe vs. O Que Falta

| Item do PDF | Status Atual |
|---|---|
| Tabela `leads` com `is_converted` | Ja existe |
| Tabela `crm_accounts` (Accounts) | Tabela existe, **pagina de gestao NAO existe** |
| Tabela `contacts` com `account_id` | Existe, mas campo e opcional (PDF quer obrigatorio na UI) |
| Tabela `deals` (Opportunities) | Ja existe |
| Tabela `contracts` + pagina | Ja existe |
| Tabela `activities` + pagina | Existe, mas falta vinculacao a Account/Contact na UI |
| Custom Fields para todos os objetos | So existe para Produtos (`product_custom_fields`) |
| Report Builder visual | Ja existe (`ReportBuilder.tsx`) |
| Soft delete de usuarios | **NAO existe** |
| Campos `converted_to_account_id` e `converted_to_contact_id` em leads | **NAO existem** |
| Pagina de Accounts (CRUD) | **NAO existe** |

## Plano de Implementacao

### Fase 1: Migracoes de Banco

**1.1 Adicionar colunas faltantes em `leads`:**
- `converted_to_account_id` (uuid, ref crm_accounts)
- `converted_to_contact_id` (uuid, ref contacts)

**1.2 Criar tabelas `custom_fields` e `custom_field_values`:**
- `custom_fields`: define campos customizaveis por objeto (accounts, contacts, deals, contracts)
- `custom_field_values`: armazena valores por registro
- RLS com tenant isolation

**1.3 Adicionar `is_active` na tabela `profiles`:**
- Permitir soft delete de usuarios (desativar em vez de excluir)

### Fase 2: Pagina de Accounts (Contas/Empresas)

**Criar `src/pages/Accounts.tsx`** com:
- Listagem de contas (crm_accounts) com busca e filtros (segmento, proprietario)
- CRUD completo: criar, editar, desativar (soft delete)
- Campos: Nome, CNPJ, Website (via email), Segmento, Telefone, Endereco
- Validacao: CNPJ unico por tenant
- Adicionar rota `/accounts` no App.tsx e link "Contas" no sidebar CRM

### Fase 3: Melhorias na Pagina de Activities

**Modificar `src/pages/Activities.tsx`:**
- Adicionar seletores de Account e Contact no formulario
- Adicionar tipo "WhatsApp Message" e "Note"
- Mostrar colunas Account e Contact na tabela
- Filtros por tipo, proprietario, e entidade vinculada

### Fase 4: Melhorias na Pagina de Contacts

**Modificar `src/pages/Contacts.tsx`:**
- Tornar campo "Empresa" (account_id) obrigatorio na UI
- Exibir alerta se tentar criar contato sem conta

### Fase 5: Custom Fields Generico

**Criar `src/pages/settings/GenericCustomFieldsSettings.tsx`:**
- Interface para selecionar objeto (Accounts, Contacts, Deals, Contracts)
- Criar/editar/excluir campos customizaveis por objeto
- Tipos: text, number, date, picklist, checkbox
- Integrar no hub de Settings

### Fase 6: Soft Delete de Usuarios

**Modificar `src/pages/settings/UsersManagement.tsx`:**
- Substituir DELETE por UPDATE `is_active = false`
- Filtrar usuarios com `is_active = true` na listagem
- Botao "Desativar" em vez de "Excluir"

### Fase 7: Atualizar Conversao de Leads

**Modificar `src/pages/Leads.tsx`:**
- Salvar `converted_to_account_id` e `converted_to_contact_id` ao converter
- Exibir informacao de conversao na listagem (link para Account)

## Detalhes Tecnicos

### SQL da Migracao

```text
-- Colunas de rastreamento de conversao em leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS converted_to_account_id uuid REFERENCES public.crm_accounts(id),
  ADD COLUMN IF NOT EXISTS converted_to_contact_id uuid REFERENCES public.contacts(id);

-- Custom fields generico
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  object_name text NOT NULL, -- 'accounts','contacts','deals','contracts'
  field_name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  field_label text NOT NULL,
  is_required boolean DEFAULT false,
  picklist_values jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, object_name, field_name)
);

CREATE TABLE public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  custom_field_id uuid NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(custom_field_id, record_id)
);

-- RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.custom_fields FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.custom_field_values FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Soft delete para profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| `src/pages/Accounts.tsx` | Criar - CRUD de contas (crm_accounts) |
| `src/pages/settings/GenericCustomFieldsSettings.tsx` | Criar - Custom fields para todos os objetos |
| `src/pages/Activities.tsx` | Modificar - Adicionar Account/Contact |
| `src/pages/Contacts.tsx` | Modificar - Account obrigatorio |
| `src/pages/Leads.tsx` | Modificar - Salvar IDs de conversao |
| `src/pages/settings/UsersManagement.tsx` | Modificar - Soft delete |
| `src/pages/settings/SettingsLayout.tsx` | Modificar - Adicionar link Custom Fields generico |
| `src/components/AppSidebar.tsx` | Modificar - Adicionar "Contas" no CRM |
| `src/App.tsx` | Modificar - Adicionar rota /accounts |
| Migration SQL | Criar |

### O Que NAO Sera Alterado

- Tabela `crm_accounts` (mantida, sem renomear)
- Tabela `deals` (mantida como esta)
- Todas as integracoes: WhatsApp, Campanhas, Funis, BI, Workflows
- Edge Functions existentes
- Pagina de Contracts (ja implementada)
- Fluxo de conversao existente (sera expandido, nao substituido)
