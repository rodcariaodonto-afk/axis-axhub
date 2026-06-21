# Tarefas: Gestão de PJ — Fase 1 (MVP)

## Slice 1 — Schema + Storage

- [ ] 1.1 Criar branch `feature/pj-management-slice1-schema`
- [ ] 1.2 Criar migration `<timestamp>_pj_management_fase1.sql`:
  - [ ] 1.2.1 ALTER crm_accounts: adicionar `account_type text NOT NULL DEFAULT 'client'` + index
  - [ ] 1.2.2 ALTER contracts: adicionar `alert_days_before_expiry integer DEFAULT 30`
  - [ ] 1.2.3 ALTER payables: adicionar `pj_id`, `repasse_type`, `repasse_status` + index
  - [ ] 1.2.4 CREATE TABLE `pj_portal_access` com UNIQUE constraint + trigger updated_at
  - [ ] 1.2.5 CREATE TABLE `pj_notifications`
  - [ ] 1.2.6 CREATE TABLE `contract_renewals` + trigger updated_at
  - [ ] 1.2.7 CREATE TABLE `pj_repasse_history` com CHECK (valor > 0)
  - [ ] 1.2.8 CREATE todos os indexes
  - [ ] 1.2.9 ENABLE RLS em todas as novas tabelas
  - [ ] 1.2.10 CREATE todas as RLS policies (tenant isolation + PJ self-access)
- [ ] 1.3 Aplicar migration via Editor SQL do Lovable
- [ ] 1.4 Validar: rodar SELECT em cada tabela nova (sem erro = OK)
- [ ] 1.5 Criar bucket `pj-documents` no Supabase Storage + policies
- [ ] 1.6 Commit + push + PR → main
- [ ] 1.7 Verificar que Lovable regenerou `types.ts` com as novas colunas/tabelas

---

## Slice 2 — Portal PJ: Layout + Auth + Dashboard

- [ ] 2.1 Criar branch `feature/pj-management-slice2-portal-layout`
- [ ] 2.2 Criar `src/hooks/usePJPortalAccess.ts`:
  - Query `pj_portal_access` por `user_id = auth.uid()`
  - Retorna `{ isPJ, pjId, tenantId, accessLevel, tenants[] }`
  - Se multiple tenants, retorna array para seletor
- [ ] 2.3 Criar `src/components/pj-portal/PJPortalSidebar.tsx`:
  - Itens: Dashboard, Contratos, Repasses, Documentos, Notificações, Perfil
  - Badge de notificações não lidas
  - Estilo consistente com shadcn/ui mas layout independente
- [ ] 2.4 Criar `src/components/pj-portal/PJPortalLayout.tsx`:
  - Sidebar + header com nome do PJ + tenant
  - Outlet para sub-páginas
  - Redirect para login se não autenticado
  - Redirect para seletor de tenant se múltiplos
- [ ] 2.5 Criar `src/components/pj-portal/PJTenantSelector.tsx`:
  - Lista tenants disponíveis
  - Ao selecionar, salva em state/context e redireciona para dashboard
- [ ] 2.6 Criar `src/components/pj-portal/PJPortalDashboard.tsx`:
  - 4 cards: contratos ativos, último repasse, docs pendentes, notificações
  - Queries com filtro tenant_id + pj_id
- [ ] 2.7 Adicionar rotas no `src/App.tsx`:
  - `/portal` → PJPortalLayout (com sub-rotas)
  - `/portal/dashboard` → PJPortalDashboard
  - Guard: redirecionar se user não é PJ
- [ ] 2.8 `npm run build` — validar TypeScript
- [ ] 2.9 Commit + push + PR → main

---

## Slice 3 — Portal PJ: Páginas Internas

- [ ] 3.1 Criar branch `feature/pj-management-slice3-portal-pages`
- [ ] 3.2 Criar `src/hooks/usePJContracts.ts`:
  - Query `contracts` WHERE `account_id = pjId` AND `tenant_id = tenantId`
  - Retorna lista com name, status, start_date, end_date, value, auto_renew
- [ ] 3.3 Criar `src/components/pj-portal/PJContractsList.tsx`:
  - Tabela read-only com colunas da spec
  - Badge de status de vigência (verde/amarelo/vermelho)
  - Expandir para ver detalhes
- [ ] 3.4 Criar `src/hooks/usePJRepasses.ts`:
  - Query `pj_repasse_history` WHERE `pj_id = pjId` AND `tenant_id = tenantId`
  - Filtros: período, status
  - Ordenação: mais recente primeiro
- [ ] 3.5 Criar `src/components/pj-portal/PJRepassesList.tsx`:
  - Tabela com valor, data, status, link comprovante
  - Filtros de período e status
- [ ] 3.6 Criar `src/components/pj-portal/PJDocumentUpload.tsx`:
  - Upload para Supabase Storage bucket `pj-documents`
  - Path: `{tenant_id}/{pj_id}/{doc_type}/{filename}`
  - Validação: PDF/JPG/PNG, max 10MB
  - Lista de documentos já enviados
- [ ] 3.7 Criar `src/hooks/usePJNotifications.ts`:
  - Query `pj_notifications` WHERE pj_id + tenant_id, ORDER BY created_at DESC
  - Mutation: mark as read (individual + massa)
- [ ] 3.8 Criar `src/components/pj-portal/PJNotificationsList.tsx`:
  - Lista com indicador de não lida
  - Botão "marcar todas como lidas"
  - Tipo com ícone diferenciado
- [ ] 3.9 Adicionar rotas restantes no App.tsx:
  - `/portal/contratos`, `/portal/repasses`, `/portal/documentos`, `/portal/notificacoes`
- [ ] 3.10 `npm run build` — validar TypeScript
- [ ] 3.11 Commit + push + PR → main

---

## Slice 4 — Admin: Dashboard de Vigência + Renovações

- [ ] 4.1 Criar branch `feature/pj-management-slice4-vigency`
- [ ] 4.2 Criar `src/hooks/useContractVigency.ts`:
  - Query `contracts` com cálculo de status: vencido, vencendo_30d, vigente, sem_vigencia
  - Filtros: PJ (account_id), status
- [ ] 4.3 Criar `src/components/contract-vigency/ContractVigencyDashboard.tsx`:
  - 4 cards de resumo (vencidos, vencendo, vigentes, sem vigência)
  - Tabela de contratos com badge colorido
  - Filtros
- [ ] 4.4 Criar `src/hooks/useContractRenewals.ts`:
  - Query `contract_renewals` por tenant
  - Mutations: aprovar, rejeitar
  - Ao aprovar: criar novo contrato (cópia) com datas atualizadas
- [ ] 4.5 Criar `src/components/contract-vigency/ContractRenewalDialog.tsx`:
  - Detalhes da renovação pendente
  - Botões aprovar/rejeitar com confirmação
- [ ] 4.6 Criar `src/components/contract-vigency/VigencyAlerts.tsx`:
  - Widget para sidebar/dashboard mostrando contratos vencendo
- [ ] 4.7 Criar página `src/pages/ContractVigency.tsx`:
  - Rota: `/contracts/vigency`
  - Monta dashboard + dialogs
- [ ] 4.8 Adicionar rota e item na sidebar (AppSidebar.tsx)
- [ ] 4.9 `npm run build`
- [ ] 4.10 Commit + push + PR → main

---

## Slice 5 — Admin: Repasses + Edge Functions

- [ ] 5.1 Criar branch `feature/pj-management-slice5-repasses`
- [ ] 5.2 Criar `src/hooks/useRepasseAdmin.ts`:
  - Query PJs disponíveis (crm_accounts WHERE account_type = 'pj_provider')
  - CRUD repasses: criar payable com pj_id + pj_repasse_history
  - Mutation: atualizar status, upload comprovante
- [ ] 5.3 Criar `src/components/repasses/RepasseCreateForm.tsx`:
  - Select de PJ (filtrado por account_type)
  - Campos: valor (> 0), data, descrição, contrato vinculado (opcional)
  - Validação Zod
- [ ] 5.4 Criar `src/components/repasses/RepasseHistoryTable.tsx`:
  - Tabela com filtros: PJ, período, status
  - Ação: marcar como pago, upload comprovante
- [ ] 5.5 Criar `src/components/repasses/RepasseComprovante.tsx`:
  - Upload de PDF para Storage
  - Preview/download do comprovante
- [ ] 5.6 Criar página `src/pages/Repasses.tsx`:
  - Rota: `/repasses`
  - Monta form + tabela
- [ ] 5.7 Criar edge function `supabase/functions/check-contract-expiry/index.ts`:
  - Query contratos com end_date próximo (30, 15, 7 dias)
  - Para cada: criar pj_notification + notificar admin
  - Idempotente: não duplicar notificações do mesmo dia
- [ ] 5.8 Criar edge function `supabase/functions/send-pj-notification/index.ts`:
  - Recebe: tenant_id, pj_id, type, title, message, related_id
  - Insere em pj_notifications
- [ ] 5.9 Adicionar rota e item na sidebar
- [ ] 5.10 `npm run build`
- [ ] 5.11 Commit + push + PR → main
- [ ] 5.12 Verificar deploy das edge functions (curl diagnóstico)
- [ ] 5.13 Verificar line count pós-deploy vs local

---

## Slice 6 — Integração + CRM + Testes E2E

- [ ] 6.1 Criar branch `feature/pj-management-slice6-integration`
- [ ] 6.2 Modificar `src/pages/CrmAccounts.tsx`:
  - Adicionar campo `account_type` no formulário (select: client, pj_provider, partner, supplier)
  - Adicionar filtro por account_type na listagem
  - Adicionar coluna account_type na tabela
- [ ] 6.3 Modificar `src/components/AppSidebar.tsx`:
  - Adicionar "Vigência de Contratos" no grupo Contratos
  - Adicionar "Repasses PJ" no grupo Financeiro
- [ ] 6.4 Teste E2E no tenant R Bahls (`7df9b3e1-4a54-4b72-bf42-4c2de3ef36ad`):
  - [ ] 6.4.1 Criar crm_account com account_type = 'pj_provider'
  - [ ] 6.4.2 Criar contrato vinculado com start_date/end_date
  - [ ] 6.4.3 Criar pj_portal_access para um email de teste
  - [ ] 6.4.4 Logar como PJ → validar dashboard
  - [ ] 6.4.5 Criar repasse no admin → validar que aparece no portal PJ
  - [ ] 6.4.6 Upload de documento no portal PJ → validar storage
  - [ ] 6.4.7 Testar cron de vigência manualmente (invocar edge function)
  - [ ] 6.4.8 Validar isolamento: PJ não vê dados de outro tenant
- [ ] 6.5 `npm run build`
- [ ] 6.6 Commit + push + PR → main
- [ ] 6.7 Validação final em produção
