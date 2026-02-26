

# Plano: Templates de Contratos com Macros

## Objetivo
Implementar um sistema de templates de contratos com macros `{{ }}` que permite criar templates reutilizaveis com preenchimento automatico de dados de Conta, Contato, Deal, Contrato, Usuario e Data.

---

## 1. Migracao de Banco de Dados

### 1.1 Tabela `contract_templates`
```text
contract_templates
  - id UUID (PK, default gen_random_uuid())
  - tenant_id UUID (FK tenants, NOT NULL)
  - name VARCHAR(255) NOT NULL
  - description TEXT
  - type VARCHAR(50) NOT NULL (sales, service, supply, nda, custom)
  - content TEXT NOT NULL (conteudo com macros {{ }})
  - is_active BOOLEAN DEFAULT true
  - created_by UUID NOT NULL (FK profiles)
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()
  - UNIQUE(tenant_id, name)
```

### 1.2 Coluna `template_id` em `contracts`
```text
contracts -> ADD COLUMN template_id UUID REFERENCES contract_templates(id)
```

### 1.3 RLS
- SELECT/INSERT/UPDATE/DELETE filtrado por `tenant_id = get_user_tenant_id()`

---

## 2. Nova Pagina: Templates de Contratos

### Rota: `/contract-templates`
Nova pagina `src/pages/ContractTemplates.tsx` com:

- Cabecalho "Templates de Contratos" + botao "+ Novo Template"
- Filtros por tipo e status (ativo/inativo) + busca por nome
- Tabela com colunas: Nome, Tipo, Descricao (truncada), Criado em, Acoes
- Acoes: Editar, Duplicar, Desativar, Deletar (com confirmacao)

### Modal de Criacao/Edicao
- Nome do template (obrigatorio)
- Tipo (Venda, Servico, Fornecimento, NDA, Customizado)
- Descricao (opcional, max 500 chars)
- Conteudo do contrato (textarea grande com suporte a macros)
- Botao "Inserir Macro" com dropdown categorizado
- Preview em tempo real ao lado/abaixo do editor
- Toggle ativo/inativo

---

## 3. Componente MacroSelector

Dropdown com categorias de macros organizadas:
- **Conta**: account_name, account_cnpj, account_phone, account_email, etc.
- **Contato**: contact_name, contact_email, contact_phone, contact_title
- **Deal**: deal_name, deal_value, deal_currency, deal_stage
- **Contrato**: contract_title, contract_type, contract_value, contract_start_date, etc.
- **Data/Usuario**: current_date, current_date_full, user_name, user_email

Ao clicar em uma macro, insere `{{macro_name}}` na posicao do cursor no editor.

---

## 4. Funcao de Preenchimento de Macros

Utilitario `src/lib/contractMacros.ts`:
- Funcao `replaceMacros(template, account, contact, deal, contract, user)` que substitui todas as macros `{{ }}` pelos valores reais
- Macros sem valor correspondente ficam em branco
- Macros invalidas permanecem como estao

---

## 5. Integracao com Criacao de Contrato

### Em `Contracts.tsx` e `ContractDetail.tsx`:
- Novo campo "Template" (opcional) no formulario de criacao
- Dropdown com templates ativos do tenant
- Ao selecionar template, preenche automaticamente o campo "Descricao" com o conteudo processado (macros substituidas)
- Usuario pode editar o texto apos preenchimento

### Fluxo:
1. Usuario clica "Novo Contrato"
2. Seleciona Conta e Deal
3. Seleciona Template (opcional)
4. Sistema busca dados da conta/deal e substitui macros no conteudo
5. Resultado aparece na Descricao, editavel
6. Salva contrato com `template_id` referenciado

---

## 6. Navegacao

- Adicionar link "Templates de Contratos" no sidebar (ou como sub-item de Contratos)
- Adicionar rota `/contract-templates` no App.tsx

---

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela `contract_templates`, add coluna `template_id` em `contracts`, RLS |
| `src/pages/ContractTemplates.tsx` | Criar — pagina de gerenciamento de templates |
| `src/lib/contractMacros.ts` | Criar — funcao de substituicao de macros |
| `src/pages/Contracts.tsx` | Editar — adicionar seletor de template no form |
| `src/pages/ContractDetail.tsx` | Editar — adicionar seletor de template no form de edicao |
| `src/App.tsx` | Editar — adicionar rota `/contract-templates` |
| `src/components/AppSidebar.tsx` | Editar — adicionar link no menu |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

---

## Detalhes Tecnicos

### Tipos de template:
```text
sales    -> Venda
service  -> Servico
supply   -> Fornecimento
nda      -> NDA
custom   -> Customizado
```

### Exemplo de template:
```text
CONTRATO DE PRESTACAO DE SERVICOS

Entre {{account_name}}, inscrita no CNPJ {{account_cnpj}},
representada por {{contact_name}}, e {{workspace_name}}.

Valor: {{deal_value}}
Vigencia: {{contract_start_date}} a {{contract_end_date}}

Data: {{current_date_full}}
```

### Query de templates ativos:
```text
supabase.from("contract_templates")
  .select("id, name, type, content")
  .eq("is_active", true)
  .order("name")
```

