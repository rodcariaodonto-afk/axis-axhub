# Plano Técnico: Gestão de PJ — Fase 1 (MVP)

## 1. Arquitetura

### 1.1 Frontend (React/TypeScript/Lovable)

**Componentes Novos — Portal PJ (layout separado)**
```
src/components/pj-portal/
├── PJPortalLayout.tsx          # Shell do portal (sidebar + header + outlet)
├── PJPortalSidebar.tsx         # Sidebar simplificada do PJ
├── PJPortalDashboard.tsx       # Dashboard com 4 widgets
├── PJContractsList.tsx         # Lista de contratos (read-only)
├── PJRepassesList.tsx          # Histórico de repasses
├── PJDocumentUpload.tsx        # Upload de documentos
├── PJNotificationsList.tsx     # Lista de notificações com mark as read
└── PJTenantSelector.tsx        # Seletor de tenant (multi-tenant PJ)
```

**Componentes Novos — Admin (dentro do layout existente)**
```
src/components/contract-vigency/
├── ContractVigencyDashboard.tsx # Dashboard de contratos por status vigência
├── ContractRenewalDialog.tsx    # Aprovar/rejeitar renovação
└── VigencyAlerts.tsx            # Widget de alertas de vencimento

src/components/repasses/
├── RepasseCreateForm.tsx        # Formulário de criação de repasse
├── RepasseHistoryTable.tsx      # Tabela de histórico por PJ
└── RepasseComprovante.tsx       # Upload/visualização de comprovante
```

**Páginas Novas**
```
src/pages/
├── PJPortal.tsx                 # Wrapper do portal PJ (rota: /portal)
├── PJPortalDashboard.tsx        # (rota: /portal/dashboard)
├── PJPortalContracts.tsx        # (rota: /portal/contratos)
├── PJPortalRepasses.tsx         # (rota: /portal/repasses)
├── PJPortalDocuments.tsx        # (rota: /portal/documentos)
├── PJPortalNotifications.tsx    # (rota: /portal/notificacoes)
├── ContractVigency.tsx          # (rota: /contracts/vigency) — admin
└── Repasses.tsx                 # (rota: /repasses) — admin
```

**Hooks Novos**
```
src/hooks/
├── usePJPortalAccess.ts         # Verifica se user é PJ, retorna pj_id/tenant_id/access_level
├── usePJContracts.ts            # Lista contratos do PJ
├── usePJRepasses.ts             # Lista repasses do PJ
├── usePJNotifications.ts        # Lista + mark as read
├── useContractVigency.ts        # Lista contratos por status vigência (admin)
├── useContractRenewals.ts       # CRUD renovações (admin)
└── useRepasseAdmin.ts           # CRUD repasses (admin)
```

**Componentes Modificados**
- `src/App.tsx` — adicionar rotas `/portal/*`, `/contracts/vigency`, `/repasses`
- `src/components/AppSidebar.tsx` — adicionar itens no grupo Contratos e Financeiro
- `src/pages/CrmAccounts.tsx` — adicionar campo `account_type` no form e filtro

### 1.2 Backend (Supabase)

**Migration única (Slice 1):**
- `supabase/migrations/<timestamp>_pj_management_fase1.sql`
- Conteúdo: ALTERs + CREATE TABLEs + RLS + indexes + triggers (conforme spec seção 6)

**Edge Functions (Slice 5):**
- `supabase/functions/check-contract-expiry/index.ts` — cron diário
- `supabase/functions/send-pj-notification/index.ts` — envio de notificação

**Supabase Storage (Slice 1):**
- Bucket `pj-documents` com policies de acesso

### 1.3 Autenticação do Portal PJ

Fluxo (reutiliza padrão existente):
1. Super Admin cria `pj_portal_access` informando email do PJ
2. Sistema verifica se email já existe em `auth.users`
   - Se não: cria user via `auth.admin.createUser()` e envia invite
   - Se sim: apenas cria `pj_portal_access` e notifica
3. PJ recebe email, clica no link, cria/confirma conta
4. No login, middleware verifica se user tem `pj_portal_access`
   - Se tem em 1 tenant: redireciona para `/portal/dashboard`
   - Se tem em N tenants: exibe `PJTenantSelector`
   - Se não tem: fluxo normal de login admin

---

## 2. Fluxo de Implementação (6 Slices)

### Slice 1 — Schema + Storage
**Objetivo:** Banco de dados pronto, storage configurado.
**Saída:** Migration aplicada, bucket criado.
**Arquivos:** 1 SQL migration.
**Branch:** `feature/pj-management-slice1-schema`
**Validação:** 
- SELECT das novas tabelas (vazio, sem erro)
- SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_accounts' deve mostrar `account_type`

### Slice 2 — Portal PJ: Layout + Auth + Dashboard
**Objetivo:** PJ consegue logar e ver o dashboard.
**Saída:** Layout separado funcionando, dashboard com widgets.
**Arquivos:** PJPortalLayout, PJPortalSidebar, PJPortalDashboard, usePJPortalAccess, rotas no App.tsx.
**Branch:** `feature/pj-management-slice2-portal-layout`
**Validação:** Login como PJ → vê dashboard com 4 cards (zerados se sem dados).

### Slice 3 — Portal PJ: Contratos + Repasses + Documentos + Notificações
**Objetivo:** Todas as páginas do portal PJ funcionando.
**Saída:** PJ navega todas as seções do portal.
**Arquivos:** PJContractsList, PJRepassesList, PJDocumentUpload, PJNotificationsList, hooks.
**Branch:** `feature/pj-management-slice3-portal-pages`
**Validação:** PJ vê contratos, repasses, faz upload de doc, vê notificações.

### Slice 4 — Admin: Dashboard de Vigência + Renovações
**Objetivo:** Admin vê contratos por status de vigência e gerencia renovações.
**Saída:** Página de vigência com filtros + dialog de renovação.
**Arquivos:** ContractVigencyDashboard, ContractRenewalDialog, VigencyAlerts, useContractVigency, useContractRenewals.
**Branch:** `feature/pj-management-slice4-vigency`
**Validação:** Admin filtra contratos por status, aprova renovação → novo contrato criado.

### Slice 5 — Admin: Gestão de Repasses + Edge Functions
**Objetivo:** Admin cria/gerencia repasses + cron de vigência ativo.
**Saída:** Formulário de repasse + edge functions deployadas.
**Arquivos:** RepasseCreateForm, RepasseHistoryTable, RepasseComprovante, useRepasseAdmin, 2 edge functions.
**Branch:** `feature/pj-management-slice5-repasses`
**Validação:** 
- Admin cria repasse → aparece no portal do PJ
- Cron de vigência gera notificação para contrato vencendo

### Slice 6 — Admin: CRM + Integração + Testes E2E
**Objetivo:** Campo account_type no CRM form, navegação completa, testes end-to-end.
**Saída:** Fluxo completo validado com dados reais no tenant R Bahls.
**Arquivos:** Modificações em CrmAccounts, AppSidebar, testes.
**Branch:** `feature/pj-management-slice6-integration`
**Validação:**
- Criar PJ no CRM com account_type = 'pj_provider'
- Criar contrato com vigência
- Criar repasse
- PJ loga no portal e vê tudo
- Cron gera alertas

---

## 3. Workflow Git (por slice)

```
1. git checkout main && git pull origin main
2. git checkout -b feature/pj-management-sliceN-descricao
3. Implementar (Claude Code no terminal)
4. npm run build (validar TypeScript)
5. git add . && git commit -m "feat(pj-management): slice N - descricao"
6. git push origin feature/pj-management-sliceN-descricao
7. Abrir PR → main (via GitHub UI ou gh pr create)
8. Merge → main (Lovable deploya edge functions)
9. Validar em produção
```

**Regras:**
- Rebase onto main antes de PR (`git rebase origin/main`)
- `--ff-only` merge
- `--force-with-lease` para safe force-push após rebase
- Verificar line count de edge functions pós-deploy

---

## 4. Dependências entre Slices

```
Slice 1 (Schema) ──→ Slice 2 (Portal Layout)
                 ──→ Slice 4 (Vigência)
                 ──→ Slice 5 (Repasses)
Slice 2 ──→ Slice 3 (Portal Pages)
Slice 4 + Slice 5 ──→ Slice 6 (Integração)
```

Slices 2-3 e 4-5 podem ser paralelos (branches independentes), mas merge sequencial em main.
