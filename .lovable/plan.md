

# Sistema de Gerenciamento de Usuarios (Funcionarios) - AXIS

## Resumo

Implementar um sistema completo de gerenciamento de usuarios/funcionarios com 3 abas: Geral (dados pessoais/profissionais), Horarios de Trabalho (dias e horarios por semana), e Permissoes (controle granular por modulo). Adaptado para a arquitetura existente do AXIS que ja usa `profiles`, `user_roles` e `tenants`.

## O que ja existe

- Tabela `profiles` (id, tenant_id, full_name, email, phone, avatar_url, status)
- Tabela `user_roles` com enum `app_role` (admin, sales, finance, operations, accounting, readonly)
- Tabela `audit_logs` para auditoria
- Pagina `UsersManagement.tsx` basica (lista usuarios + troca de role via select)
- Sistema de auth com Supabase Auth

## O que sera implementado

### Etapa A - Banco de Dados (Migracao SQL)

1. **Adicionar colunas na tabela `profiles`**: `birth_date` (DATE), `default_theme` (TEXT, default 'dark'), `default_menu` (TEXT, default 'open'), `farewell_message` (TEXT)

2. **Criar tabela `user_work_hours`**:
   - id (UUID PK), tenant_id (UUID), user_id (UUID), day_of_week (INTEGER 0-6), start_time (TIME), end_time (TIME), is_working_day (BOOLEAN default true), created_at, updated_at
   - RLS com tenant isolation
   - Indices em user_id e day_of_week

3. **Criar tabela `user_permissions`**:
   - id (UUID PK), tenant_id (UUID), user_id (UUID), module_name (VARCHAR), can_view (BOOLEAN), can_create (BOOLEAN), can_edit (BOOLEAN), can_delete (BOOLEAN), can_export (BOOLEAN), can_manage_users (BOOLEAN), created_at, updated_at
   - Constraint UNIQUE(user_id, module_name)
   - RLS com tenant isolation
   - Indices em user_id e module_name

4. **Modulos de permissoes**: whatsapp, crm, kanban, campanhas, workflows, automacao, dashboard, contatos, relatorios, configuracoes, financeiro, produtos, funis

### Etapa B - Edge Function

1. **create-user-with-permissions**: Cria usuario no Auth (com admin API), insere profile, horarios de trabalho e permissoes de uma so vez. Registra auditoria.

### Etapa C - Frontend

1. **Reescrever `UsersManagement.tsx`** com:
   - Lista de usuarios com busca, filtros por status/perfil
   - Botao "Adicionar Usuario"
   - Acoes de editar/excluir por usuario
   - Indicador visual de status (ativo/inativo)

2. **Criar `UserFormModal.tsx`** com 3 abas:
   - **Aba Geral**: Nome, email, senha (so criacao), telefone, data nascimento, perfil (role), avatar, tema padrao, menu padrao, mensagem de despedida
   - **Aba Horarios de Trabalho**: Grid com dias da semana (Seg-Dom), toggle ativo/inativo, horario inicio/fim para cada dia
   - **Aba Permissoes**: Grid com modulos x acoes (visualizar, criar, editar, deletar, exportar, gerenciar usuarios). Checkboxes por modulo. Toggle "Acesso Total" para marcar tudo

3. **Criar hook `useUserPermissions.ts`**: Hook que carrega permissoes do usuario logado e expoe funcao `hasPermission(module, action)` para uso em toda a aplicacao

### Detalhes Tecnicos

**Arquivos novos:**
- `src/components/users/UserFormModal.tsx` - Modal com 3 abas (Geral, Horarios, Permissoes)
- `src/components/users/WorkHoursTab.tsx` - Aba de horarios de trabalho
- `src/components/users/PermissionsTab.tsx` - Aba de permissoes granulares
- `src/hooks/useUserPermissions.ts` - Hook de verificacao de permissoes
- `supabase/functions/create-user-with-permissions/index.ts` - Edge function

**Arquivos modificados:**
- `src/pages/settings/UsersManagement.tsx` - Reescrita completa com lista rica + modal
- Migracao SQL para novas tabelas e colunas

**Fluxo de criacao de usuario:**
```text
Admin clica "Adicionar Usuario"
  -> Modal abre na aba Geral
  -> Preenche dados pessoais + perfil
  -> Aba Horarios: configura dias/horas de trabalho
  -> Aba Permissoes: marca checkboxes por modulo
  -> Clica Salvar
  -> Edge Function cria usuario no Auth + profile + work_hours + permissions
  -> Lista atualiza
```

**Fluxo de verificacao de permissoes:**
```text
Usuario navega para modulo (ex: Campanhas)
  -> useUserPermissions() carrega permissoes do cache
  -> hasPermission('campanhas', 'view') retorna true/false
  -> UI mostra/esconde botoes baseado nas permissoes
```
