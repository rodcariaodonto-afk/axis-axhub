

# Completar Pagina de Accounts - Nivel Salesforce

## O Que Ja Existe
- Tabela `crm_accounts` com campos basicos (name, cnpj, email, phone, segment, address_json, owner_user_id)
- Pagina `Accounts.tsx` com CRUD simples (listagem, criar, editar)
- Rota `/accounts` e link no sidebar

## O Que Falta (Segundo o PDF)

| Funcionalidade | Status |
|---|---|
| Campo `website` na tabela | Falta |
| Campo `is_active` na tabela | Falta |
| Campos de endereco separados (city, state, country, postal_code) | Usar `address_json` (ja existe) |
| Pagina de Detalhes com abas (Contatos, Oportunidades, Contratos, Atividades) | Falta |
| Seletor de Proprietario (owner) no formulario | Falta |
| Botao "Desativar" (soft delete) | Falta |
| Paginacao (10 por pagina) | Falta |
| Validacao de CNPJ | Falta |
| Validacao de URL/Website | Falta |
| Filtro por Proprietario | Falta |
| Nome clicavel na listagem (abre detalhes) | Falta |
| Posicao no sidebar (entre Leads e Contacts) | Ja esta correto |

## Plano de Implementacao

### Fase 1: Migracao de Banco
Adicionar 2 colunas a `crm_accounts`:
- `website` (text, nullable)
- `is_active` (boolean, default true)

Criar indice em `is_active` para performance.

### Fase 2: Reescrever Pagina de Listagem (`Accounts.tsx`)
- Adicionar campo `website` na tabela e no formulario
- Adicionar seletor de Proprietario (carregado de `profiles`)
- Adicionar filtro por Proprietario
- Adicionar paginacao (10 por pagina)
- Tornar nome clicavel (navega para `/accounts/:id`)
- Filtrar apenas contas ativas (`is_active = true`)
- Separar campos de endereco: Endereco, Cidade, Estado, Pais, CEP (salvos em `address_json`)
- Validacao de CNPJ (formato XX.XXX.XXX/XXXX-XX)
- Validacao de URL para Website

### Fase 3: Criar Pagina de Detalhes (`AccountDetail.tsx`)
- Rota: `/accounts/:id`
- Cabecalho com nome da conta e botoes (Editar, Desativar, Voltar)
- Informacoes principais: CNPJ, Website, Segmento, Telefone, Endereco, Proprietario
- 4 abas preparadas para futuro: Contatos, Oportunidades, Contratos, Atividades
  - Cada aba exibe registros vinculados via `account_id`
- Modal de edicao com mesmos campos do formulario de criacao
- Botao "Desativar" com confirmacao (marca `is_active = false`)

### Fase 4: Atualizar Rotas
- Adicionar rota `/accounts/:id` em `App.tsx`

## Detalhes Tecnicos

### SQL da Migracao

```text
ALTER TABLE public.crm_accounts 
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_crm_accounts_is_active ON public.crm_accounts(is_active);
```

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar - website + is_active |
| `src/pages/Accounts.tsx` | Reescrever - Formulario completo, paginacao, validacoes, owner |
| `src/pages/AccountDetail.tsx` | Criar - Detalhes com abas |
| `src/App.tsx` | Modificar - Adicionar rota /accounts/:id |

### O Que NAO Sera Alterado
- Tabela `crm_accounts` mantida (nao renomear)
- Sidebar (posicao ja correta)
- Integracoes existentes
- Demais paginas do CRM
