

# Implementar Contracts Completo (Nivel Salesforce)

## Analise: O Que Ja Existe vs. O Que Falta

### Tabela `contracts` - Colunas Faltando

| Coluna PDF | Existe? |
|---|---|
| name/title | Existe como `name` |
| account_id | Existe |
| deal_id | Existe (extra) |
| description | **Falta** |
| contract_type | **Falta** |
| currency | **Falta** |
| renewal_date | **Falta** |
| owner_id | **Falta** |
| is_active | **Falta** |
| signature_status | **Falta** |
| signed_by_id | **Falta** |
| signed_at | **Falta** |
| signature_token | **Falta** |

### Tabelas Novas Necessarias

| Tabela | Status |
|---|---|
| contract_versions | **Falta** |
| contract_signatures | **Falta** |

### Funcionalidades de UI Faltando

| Funcionalidade | Status |
|---|---|
| Sidebar: Contratos apos Contas, antes de Contatos | Falta - esta apos Forecasting |
| Campos extras no formulario (descricao, tipo, moeda, renovacao, owner) | Falta |
| Account obrigatorio no form | Falta |
| Filtro por Conta | Falta |
| Filtro por Data (range) | Falta |
| Paginacao (10/pagina) | Falta |
| Titulo clicavel (abre detalhes) | Falta |
| Pagina de Detalhes do Contrato | Falta |
| Modal Editar com descricao da alteracao | Falta |
| Historico de Versoes | Falta |
| Secao Assinatura Digital (canvas + status) | Falta |
| Desativar (soft delete) em vez de Excluir | Falta |
| Calculo de dias ate vencimento | Falta |
| Cores de alerta (verde/amarelo/vermelho) | Falta |
| Validacao data inicio < data termino | Falta |

---

## Plano de Implementacao

### Fase 1: Migracao de Banco

**1.1 Adicionar colunas a `contracts`:**
- `description` (text, nullable)
- `contract_type` (varchar, nullable) -- Servico, Venda, Parceria, Licenca, Outro
- `currency` (varchar(3), default 'BRL')
- `renewal_date` (date, nullable)
- `owner_id` (uuid, nullable)
- `is_active` (boolean, default true)
- `signature_status` (varchar, default 'Unsigned')
- `signed_by_id` (uuid, nullable)
- `signed_at` (timestamptz, nullable)
- `signature_token` (varchar, nullable)

**1.2 Criar tabela `contract_versions`:**
- id, contract_id, version_number, title/name, description, contract_type, status, value, currency, start_date, end_date, renewal_date, changed_by_id, change_description, created_at
- Indice em contract_id
- RLS com tenant isolation (via join com contracts)

**1.3 Criar tabela `contract_signatures`:**
- id, contract_id, signer_id, signature_url, signed_at, ip_address, signature_token (unique), is_valid, tenant_id
- Indice em contract_id
- RLS com tenant isolation

**1.4 Indexes em `contracts`:**
- idx_contracts_account_id, idx_contracts_owner_id, idx_contracts_status, idx_contracts_is_active

### Fase 2: Sidebar

Mover "Contratos" para logo apos "Contas" e antes de "Leads" no array `crmItems`.

### Fase 3: Reescrever Listagem (`Contracts.tsx`)

- Campos extras no formulario: Descricao, Tipo de Contrato, Moeda, Data de Renovacao, Proprietario
- Account obrigatorio (sem opcao "Nenhuma")
- Validacoes: titulo obrigatorio, owner obrigatorio, data inicio < data termino, valor positivo
- Filtros: por Status, por Conta, por Data
- Paginacao (10 por pagina)
- Titulo clicavel (navega para `/contracts/:id`)
- Conta clicavel (navega para `/accounts/:id`)
- Badge de status com cores do PDF (Draft=cinza, Active=verde, Expired=vermelho, Renewed=azul, Cancelled=preto)
- Coluna "Dias ate Vencimento" com cores de alerta
- Soft delete (Desativar) em vez de Excluir
- Filtrar apenas contratos ativos

### Fase 4: Criar Pagina de Detalhes (`ContractDetail.tsx`)

- Rota: `/contracts/:id`
- Cabecalho: Titulo + Badge de Status + Botoes (Editar, Desativar, Voltar)
- Secao 1 - Info Principal: Conta (clicavel), Tipo, Proprietario, Data Criacao
- Secao 2 - Financeiro: Valor formatado, Moeda
- Secao 3 - Datas: Inicio, Termino, Renovacao, Dias ate Vencimento (com cor)
- Secao 4 - Descricao
- Secao 5 - Assinatura Digital: Status badge, botao "Assinar Contrato" (canvas), historico
- Abas preparadas: Atividades (vazio), Anexos (vazio)
- Modal Editar: mesmos campos + "Descricao da Alteracao" + cria versao automatica
- Modal Historico de Versoes: tabela com versoes, botao Restaurar
- Modal Assinar: canvas para desenho, checkbox concordancia, salva em contract_signatures

### Fase 5: Rotas

- Adicionar `/contracts/:id` em `App.tsx`

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar - colunas + tabelas + indexes |
| `src/components/AppSidebar.tsx` | Modificar - reordenar Contratos no menu |
| `src/pages/Contracts.tsx` | Reescrever - formulario completo, filtros, paginacao |
| `src/pages/ContractDetail.tsx` | Criar - detalhes, versoes, assinatura |
| `src/App.tsx` | Modificar - adicionar rota /contracts/:id |

## Nota sobre Assinatura Digital

A assinatura sera implementada com canvas HTML5 para desenho manual. O envio de link por e-mail e a pagina publica de assinatura serao preparados na estrutura (tabelas e campos) mas a integracao com servico de e-mail ficara para um proximo passo, pois requer configuracao de SMTP/servico de e-mail externo.

