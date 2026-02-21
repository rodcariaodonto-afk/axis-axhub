
# AXHUB - Relatorio de Funil, Automacoes CRM-ERP e Campos Customizaveis

## Resumo

Quatro funcionalidades serao implementadas:

1. **Relatorio de Performance do Funil** - Nova pagina com metricas de conversao, tempo medio no pipeline e valor por status
2. **Deal Ganho gera Pedido automaticamente** - Ao marcar "Ganho" no DealDetail, cria pedido no ERP
3. **Automacoes financeiras** - Pedido concluido gera conta a receber; OC recebida gera conta a pagar
4. **Campos customizaveis nos Produtos** - Tabela `product_custom_fields` + `product_custom_values` para o tenant definir campos extras

---

## 1. Relatorio de Performance do Funil

**Nova pagina:** `src/pages/FunnelReport.tsx`

- Cards de resumo: Total de deals abertos, ganhos, perdidos e valor total por status
- Grafico de funil com Recharts (BarChart horizontal) mostrando quantidade de deals por etapa
- Taxa de conversao por etapa (deals que avancaram / total na etapa)
- Tempo medio no pipeline (diferenca entre `created_at` e `updated_at` dos deals ganhos/perdidos)
- Tabela resumo com etapas, quantidade, valor e % conversao

**Rota:** `/funnel-report`
**Sidebar:** Novo item "Funil" no grupo CRM com icone `BarChart3`

---

## 2. Deal Ganho gera Pedido ERP

**Arquivo modificado:** `src/pages/DealDetail.tsx`

Na funcao `markWon`:
- Apos atualizar status para "won", buscar `tenant_id` do perfil
- Gerar numero de pedido `PED-{timestamp}`
- Inserir em `orders` com `source: "crm"`, `status: "draft"`, `total: deal.estimated_value`
- Se o deal tiver `lead_id`, buscar se existe um customer com mesmo email; se nao, criar customer a partir do lead
- Exibir toast com link para o pedido criado

---

## 3. Automacoes Financeiras

**Arquivo modificado:** `src/pages/Orders.tsx`

Na funcao `changeStatus`, quando `newStatus === "completed"`:
- Buscar `tenant_id` e dados do pedido (customer_id, total)
- Inserir em `receivables` com descricao "Pedido {numero}", valor total, vencimento +30 dias
- Toast informando que conta a receber foi gerada

**Arquivo modificado:** `src/pages/Purchases.tsx`

Na funcao `receiveOrder`, apos atualizar estoque:
- Inserir em `payables` com descricao "OC {numero}", valor total, fornecedor, vencimento +30 dias
- Toast informando que conta a pagar foi gerada

---

## 4. Campos Customizaveis de Produtos

### Banco de dados (migracao)

Duas novas tabelas:

- **`product_custom_fields`** - Define os campos customizaveis por tenant
  - `id`, `tenant_id`, `field_name`, `field_type` (text, number, boolean, select), `options` (text[] para tipo select), `is_required`, `sort_order`, `created_at`
  - RLS: tenant_id = get_user_tenant_id()

- **`product_custom_values`** - Armazena os valores por produto
  - `id`, `tenant_id`, `product_id`, `field_id`, `value` (text), `created_at`
  - RLS: tenant_id = get_user_tenant_id()

### Interface

**Arquivo modificado:** `src/pages/Products.tsx`

- Botao "Gerenciar Campos" abre dialog para CRUD dos custom fields (nome, tipo, opcoes, obrigatorio)
- No formulario de "Novo Produto", renderizar dinamicamente os campos customizaveis abaixo dos campos padrao
- Na tabela de listagem, mostrar colunas extras para cada custom field ativo
- Ao criar/editar produto, salvar os valores customizados em `product_custom_values`

---

## Detalhes Tecnicos

### Migracao SQL

```text
-- product_custom_fields
CREATE TABLE product_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  field_name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options text[] DEFAULT '{}',
  is_required boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON product_custom_fields AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- product_custom_values
CREATE TABLE product_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  field_id uuid NOT NULL,
  value text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_custom_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON product_custom_values AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
```

### Arquivos modificados/criados

| Arquivo | Acao |
|---------|------|
| `src/pages/FunnelReport.tsx` | Novo - relatorio de funil |
| `src/pages/DealDetail.tsx` | Modificado - markWon gera pedido |
| `src/pages/Orders.tsx` | Modificado - completed gera receivable |
| `src/pages/Purchases.tsx` | Modificado - received gera payable |
| `src/pages/Products.tsx` | Modificado - campos customizaveis |
| `src/components/AppSidebar.tsx` | Modificado - link Funil no CRM |
| `src/App.tsx` | Modificado - rota /funnel-report |

### Ordem de implementacao

1. Migracao (custom fields tables)
2. FunnelReport + rota + sidebar
3. DealDetail - automacao deal ganho -> pedido
4. Orders - automacao completed -> receivable
5. Purchases - automacao received -> payable
6. Products - campos customizaveis UI
