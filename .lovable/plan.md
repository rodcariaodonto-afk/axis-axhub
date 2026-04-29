# Plano — Módulo Fiscal Focus NFe (UI completa)

Backend já pronto (tabelas `fiscal_settings`, `fiscal_invoices`, campos fiscais em `products`, bucket `fiscal-certificates`, edge functions `process-fiscal-invoice` e `focus-nfe-webhook` em mock mode). Vou construir apenas a interface, seguindo padrões existentes (react-query, shadcn/ui, hooks `useAuth` + `get_user_tenant_id`, toasts via `@/hooks/use-toast`).

## Slice 1 — Configurações Fiscais (`/settings` → seção "Fiscal")

**Novo:** `src/pages/settings/FiscalSettings.tsx` com 3 abas (`Tabs` shadcn).

- **Aba "Dados da Empresa"**: form react-hook-form com Razão Social, CNPJ (máscara via `formatDocument`), IE, IM, Regime Tributário (Select 1/2/3), bloco de Endereço Fiscal (CEP com máscara + ViaCEP via `useAddressCep`, logradouro, número, complemento, bairro, município, UF (Select com 27 estados), código IBGE 7 dígitos), 3 Switches (`habilita_nfe`, `habilita_nfse`, `habilita_nfce`). Botão Salvar → `upsert` em `fiscal_settings` por `tenant_id`.
- **Aba "Focus NFe"**: Select `focus_environment` (homologacao/producao) com Alert vermelho ao escolher produção; inputs password para `focus_token_homologacao` e `focus_token_producao`; botão Salvar; botão "Testar Conexão" → toast "Funcionalidade em construção".
- **Aba "Certificado Digital"**: Card explicativo; estado atual (Alert "nenhum certificado" ou data + Badge Pendente/Registrado); input file `.pfx` (validação extensão + 5MB), upload em `fiscal-certificates/{tenant_id}/certificado.pfx` com `upsert: true`, atualiza `certificate_path`/`certificate_uploaded_at`/`certificate_registered_on_focus=false`; botão "Registrar empresa na Focus NFe" abre Dialog com input password e toast "Funcionalidade em construção" (placeholder).

**Edita:**
- `src/pages/settings/SettingsLayout.tsx`: novo grupo "FISCAL" com item `fiscal` e ícone `Receipt` (lucide).
- `src/pages/Settings.tsx`: registra `fiscal: FiscalSettings` no `SECTION_MAP` e expande o tipo em `SettingsLayout`.

(O sidebar principal já leva a `/settings`; não precisa adicionar item separado em `AppSidebar`.)

## Slice 2 — Aba "Dados Fiscais" no formulário de Produtos

**Edita:** `src/components/products/ProductFormDynamic.tsx`

- Reorganizar conteúdo do form atual em `Tabs`: aba "Geral" (campos atuais) e nova aba "Dados Fiscais".
- Aba Dados Fiscais: NCM (Input, helper 8 dígitos), CFOP (Select com 5101/5102/5403/5933/6101/6102/6403 + opção "Outro" liberando Input livre), CST (Input com helper sobre CSOSN/CST), `unidade_fiscal` (Select UN/KG/L/M/M2/M3/CX/PC/Outro), `origem_icms` (Select 0–5 com labels descritivas).
- Persistir esses 5 campos no `insert` em `products` (colunas já existem).

## Slice 3 — Emissão de NF em Pedidos

**Edita:** `src/pages/Orders.tsx`

- Buscar `fiscal_invoices` agrupadas por `order_id` no fetch (uma query auxiliar) e indexar por order_id.
- Nova coluna "Nota Fiscal" na tabela com Badge colorida conforme status (`—` cinza / `Processando` amarela / `Autorizada` verde / `Cancelada` cinza / `Erro` vermelha).
- No `DropdownMenu` de cada linha, adicionar ações:
  - **Emitir NF-e / Emitir NFS-e** → `supabase.functions.invoke('process-fiscal-invoice', { body: { order_id, type } })`. Antes da chamada, validar via query: `fiscal_settings` existe e o `habilita_nfe`/`habilita_nfse` correspondente está true; para NF-e validar se itens do pedido têm NCM e CFOP. Toast amigável de sucesso/erro e refetch.
  - **Baixar DANFE** (visível só se `status='autorizada'` e `caminho_danfe`): abre URL `https://api.focusnfe.com.br` ou `https://homologacao.focusnfe.com.br` + caminho, em nova aba.
  - **Baixar XML**: idem com `caminho_xml`.

## Slice 4 — Listagem `/erp/notas-fiscais`

**Novo:** `src/pages/erp/FiscalInvoices.tsx` listando `fiscal_invoices` do tenant com join (`orders(number, total, customers(name))`).

- Filtros topo: Período (Popover + Calendar range), Status (Select), Tipo (NF-e/NFS-e), Ambiente (Homologação/Produção).
- Busca por número da nota ou nome do cliente (debounced).
- Tabela: Data emissão, Tipo (Badge), Número/Série, Pedido (link `/orders` ou modal), Cliente, Valor, Status (Badge), Ambiente (Badge), Ações (Baixar DANFE, Baixar XML, Cancelar — placeholder com toast).
- Loading e empty state amigáveis ("Nenhuma nota fiscal emitida ainda").

**Edita:**
- `src/App.tsx`: rota `/erp/notas-fiscais` (lazy, dentro de `ProtectedRoute`).
- `src/components/AppSidebar.tsx`: item "Notas Fiscais" no grupo ERP, ícone `FileText`, módulo `produtos`.

## Detalhes técnicos

- Reuso: `useAuth`, RPC `get_user_tenant_id`, `formatDocument`/`stripDocument`, `useAddressCep`, `useToast`, react-query `useQuery`/`useMutation`, padrões shadcn (`Card`, `Tabs`, `Select`, `Switch`, `Dialog`, `Alert`, `Badge`, `Table`, `Popover`, `Calendar`).
- Validação client-side com mensagens em português; nenhuma alteração em RLS, Edge Functions, Storage policies ou tabelas.
- Tipos: como `fiscal_settings`/`fiscal_invoices` foram regenerados em `supabase/types.ts`, usar tipagem direta; se algum campo não estiver tipado, fazer cast pontual `as any` no insert/update.
- Identidade visual AXIS preservada (cores, espaçamentos, tipografia das páginas existentes).

## Entrega esperada
1. Lista de arquivos criados/modificados.
2. Confirmação: item Fiscal aparece em /settings, aba Dados Fiscais aparece no form de produtos, botões de NF aparecem em /orders, listagem /erp/notas-fiscais acessível.
3. Sem erros de TypeScript/ESLint.
