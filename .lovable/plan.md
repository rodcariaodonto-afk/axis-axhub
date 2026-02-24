

# Reorganizar Menu Lateral - AXIS (Prompt 7)

## Objetivo

Reorganizar completamente o menu lateral da plataforma AXIS seguindo o padrao Salesforce com 7 secoes principais colapssiveis, substituindo o menu plano atual com 20+ itens desorganizados.

## Menu Novo (Estrutura Final)

```text
AXis (Logo)
├── CRM (colapsavel)
│   ├── Dashboard        -> /crm-dashboard
│   ├── Leads            -> /leads
│   ├── Contas           -> /accounts
│   ├── Contatos         -> /contacts
│   ├── Oportunidades    -> /opportunities
│   ├── Contratos        -> /contracts
│   ├── Atividades       -> /activities
│   └── Relatorios       -> /reports
├── ERP (colapsavel)
│   ├── Produtos         -> /products
│   ├── Estoque          -> /stock
│   ├── Clientes         -> /customers
│   ├── Pedidos          -> /orders
│   ├── Compras          -> /purchases
│   └── Fornecedores     -> /suppliers
├── Financeiro (colapsavel)
│   ├── Contas a Receber -> /receivables
│   ├── Contas a Pagar   -> /payables
│   ├── Contas Bancarias -> /bank-accounts
│   └── Fluxo de Caixa   -> /finance
├── Comunicacao (colapsavel)
│   ├── WhatsApp         -> /whatsapp
│   ├── Chat Interno     -> /internal-chat
│   └── Campanhas        -> /campanhas
├── Automacao (colapsavel)
│   ├── Workflows        -> /workflows
│   └── Cadencias        -> /cadences
├── Inteligencia (colapsavel)
│   └── Business Intelligence -> /business-intelligence
├── Administracao (colapsavel)
│   ├── Configuracoes    -> /settings
│   ├── Documentacao     -> /documentation
│   └── Sair             -> (signOut)
```

## Decisoes Tecnicas

### Rotas: Manter as existentes

O documento pede rotas com prefixo (`/crm/leads`, `/erp/products`, etc.), mas isso quebraria todos os links internos, componentes de detalhe, e navegacao existente em dezenas de arquivos. A mudanca seria massiva e arriscada.

**Decisao:** Manter as rotas atuais (`/leads`, `/products`, etc.) mas reorganizar apenas a estrutura visual do menu. O resultado final e identico para o usuario - a navegacao fica organizada em 7 secoes collapsiveis.

### Itens Removidos do Menu

- Kanban (`/pipeline`) - funcionalidade ja esta dentro de Opportunities
- Propostas (`/proposals`) - funcionalidade acessivel via CRM
- Funil (`/funnel-report`) - funcionalidade migrada para BI
- Forecasting (`/forecasting`) - funcionalidade migrada para BI
- Funis de Venda (`/funis`) - substituido por Opportunities

As rotas continuam funcionando (nao serao removidas do App.tsx), apenas nao aparecerao mais no menu.

### Componente Collapsible

Usar os componentes `Collapsible` do Radix UI que ja existem no projeto, combinados com `SidebarMenuItem`, `SidebarMenuSub`, `SidebarMenuSubItem`, e `SidebarMenuSubButton` que ja estao disponivel no `sidebar.tsx`.

## Arquivos a Modificar

| Arquivo | Acao |
|---|---|
| `src/components/AppSidebar.tsx` | **Reescrever** - Menu com 7 secoes collapsiveis usando Collapsible + SidebarMenuSub |

Apenas 1 arquivo precisa ser modificado. Nenhuma rota, nenhuma pagina, nenhuma migracao de banco.

## Detalhes da Implementacao

### AppSidebar.tsx

1. Importar `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` do Radix
2. Importar `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` do sidebar.tsx
3. Importar `ChevronRight` do lucide para indicador de expand/collapse
4. Definir 7 grupos de menu com seus itens e icones
5. Criar funcao `renderCollapsibleGroup` que renderiza cada secao como:
   - `SidebarMenuItem` com `Collapsible` wrapper
   - `CollapsibleTrigger` mostrando icone da secao + label + chevron
   - `CollapsibleContent` com `SidebarMenuSub` contendo os sub-itens
6. Manter logo no header
7. Secoes CRM e ERP iniciam abertas por padrao (as mais usadas)
8. "Sair" fica como ultimo item dentro de Administracao
9. Icones Lucide para cada secao: `BarChart3` (CRM), `Package` (ERP), `Banknote` (Financeiro), `MessageCircle` (Comunicacao), `Zap` (Automacao), `BrainCircuit` (Inteligencia), `Settings` (Administracao)
10. Destacar item ativo baseado na rota atual

