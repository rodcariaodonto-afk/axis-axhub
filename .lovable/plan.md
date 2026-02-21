

# AXHUB - Completar ERP + Iniciar CRM Completo

## Analise do Estado Atual

### ERP - O que falta completar:

| Modulo | Status Atual | O que Falta |
|--------|-------------|-------------|
| Produtos | CRUD basico OK | Editar/excluir produto |
| Clientes | CRUD basico OK | Editar/excluir cliente |
| Pedidos | Criar OK, listar OK | Alterar status (aprovar, enviar, concluir, cancelar) |
| Fornecedores | CRUD basico OK | Editar/excluir fornecedor |
| Compras | Somente leitura | Criar PO com itens, receber mercadoria, atualizar estoque |
| Estoque | Somente leitura | Registrar movimentacoes, gerenciar depositos |
| A Receber | Somente leitura | Criar conta, marcar como pago com 1 clique |
| A Pagar | Somente leitura | Criar conta, marcar como pago com 1 clique |
| Contas Bancarias | Criar/listar OK | - |
| Financeiro | Placeholder estatico | Dados reais, grafico de fluxo de caixa |
| Dashboard | Metricas basicas OK | Graficos (recharts), pedidos recentes |
| Settings | Minimo | Gerenciar perfil, info do tenant |

### CRM - Tudo novo (banco + UI):

Tabelas necessarias: `leads`, `accounts`, `contacts`, `sales_pipelines`, `pipeline_stages`, `deals`, `activities`

---

## Plano de Execucao (2 Etapas)

### Etapa A: Finalizar ERP (funcionalidades completas)

**A1. Contas a Receber e a Pagar completas**
- Botao "Nova Conta" com formulario (descricao, valor, vencimento, cliente/fornecedor)
- Botao "Marcar como Pago" inline na tabela com 1 clique
- Destaque visual para contas vencidas (vermelho)
- Filtros por status (pendente, pago, vencido)

**A2. Workflow de Status nos Pedidos**
- Dropdown de acoes no pedido: Aprovar, Enviar, Concluir, Cancelar
- Cores por status (badges diferenciados)
- Validacao de transicoes (ex: nao pode enviar se nao aprovado)

**A3. Ordens de Compra completas**
- Formulario para criar PO com selecao de fornecedor e produtos
- Itens da PO com quantidade e preco unitario
- Botao "Receber" que atualiza estoque automaticamente

**A4. Estoque funcional**
- Formulario para criar depositos (warehouses)
- Registrar movimentacoes (entrada, saida, ajuste) com motivo
- Atualizar product_stock automaticamente

**A5. Dashboard e Financeiro com dados reais**
- Financeiro: queries reais para totalizar receber/pagar/saldo
- Dashboard: adicionar grafico de receita com Recharts
- Lista de pedidos recentes no dashboard

---

### Etapa B: CRM Completo (banco de dados + todas as telas)

**B1. Migracao de banco - criar tabelas CRM**
- `leads` (name, email, phone, source, tags, score, status, owner_user_id)
- `accounts` (name, cnpj, segment, phone, email, address_json, owner_user_id)
- `contacts` (account_id, first_name, last_name, email, phone, position, is_primary)
- `sales_pipelines` (name, is_default)
- `pipeline_stages` (pipeline_id, name, order, probability)
- `deals` (pipeline_id, stage_id, name, lead_id, contact_id, account_id, estimated_value, expected_close_date, responsible_user_id, status, lost_reason)
- `activities` (type, title, description, due_at, done_at, deal_id, lead_id, contact_id, owner_user_id)
- Todas com tenant_id + RLS
- Inserir pipeline padrao com stages: Qualificacao, Proposta, Negociacao, Fechamento
- Trigger para criar pipeline padrao ao criar tenant

**B2. Pagina de Leads**
- Lista com filtros por source, status, score
- Criar lead manual (nome, email, telefone, fonte)
- Editar/excluir lead
- Badge de score e status
- Converter lead em deal (botao dedicado)

**B3. Pipeline Kanban**
- Visualizacao em colunas por stage do pipeline
- Cards de deal mostrando: nome, valor estimado, contato, data prevista
- Drag-and-drop entre colunas (atualiza stage_id)
- Criar deal direto no kanban
- Filtros por pipeline e responsavel

**B4. Deal 360 (pagina de detalhe)**
- Pagina unica com todas as informacoes do deal (sem abas)
- Secoes: Info do Deal, Contato, Conta, Timeline de Atividades
- Botoes: Criar Atividade, Marcar como Ganho/Perdido
- Deal ganho pode gerar pedido automaticamente (link CRM->ERP)

**B5. Pagina de Atividades**
- Lista de atividades com filtros (tipo, status, responsavel)
- Criar atividade vinculada a deal/lead/contato
- Marcar como concluida com 1 clique

**B6. Sidebar atualizada**
- Novo grupo "CRM" no menu: Leads, Pipeline, Deals, Atividades
- Icones e labels em portugues

---

## Detalhes Tecnicos

### Migracao SQL (Etapa B1)
```text
-- Novas tabelas CRM
leads (id, tenant_id, name, email, phone, source, tags text[], score int, status, owner_user_id, created_at)
accounts (id, tenant_id, name, cnpj, segment, phone, email, address_json, owner_user_id, created_at)
contacts (id, tenant_id, account_id FK, first_name, last_name, email, phone, position, is_primary, created_at)
sales_pipelines (id, tenant_id, name, is_default, created_at)
pipeline_stages (id, tenant_id, pipeline_id FK, name, "order" int, probability decimal, created_at)
deals (id, tenant_id, pipeline_id FK, stage_id FK, name, lead_id FK, contact_id FK, account_id FK, estimated_value, expected_close_date, responsible_user_id, status, lost_reason, created_at, updated_at)
activities (id, tenant_id, type, title, description, due_at, done_at, deal_id FK, lead_id FK, contact_id FK, owner_user_id, created_at)

-- RLS: todas com policy tenant_id = get_user_tenant_id()
-- Pipeline padrao inserido via migracao
```

### Kanban (drag-and-drop)
- Implementado com colunas CSS grid + event handlers nativos (onDragStart/onDragOver/onDrop)
- Sem dependencia extra, usando HTML5 Drag API
- Atualiza stage_id via supabase.from("deals").update()

### Arquivos novos
- `src/pages/Leads.tsx`
- `src/pages/Pipeline.tsx`
- `src/pages/DealDetail.tsx`
- `src/pages/Activities.tsx`
- Rotas adicionadas em `App.tsx`

### Ordem de implementacao
1. Etapa A completa (ERP funcional)
2. Migracao B1 (tabelas CRM)
3. Sidebar + rotas CRM
4. Leads -> Pipeline Kanban -> Deal 360 -> Atividades

