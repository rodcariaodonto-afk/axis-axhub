

## Melhorar Sistema de Logs de Auditoria

### Situação atual
- Tabela `audit_logs` existe com: `id`, `tenant_id`, `actor_user_id`, `action`, `entity`, `entity_id`, `before_json`, `after_json`, `created_at`
- Interface básica com filtro por entidade e ação, exportação CSV simples
- Falta: nome do usuário, IP, filtro por data, filtro por usuário, exportação JSON, diff visual destacado, mais entidades

### Mudanças

**1. Migração SQL — Adicionar colunas à tabela `audit_logs`**
- `ip_address` (text, nullable) — endereço IP da ação
- `user_agent` (text, nullable) — navegador/dispositivo
- Criar índices para performance em consultas filtradas (`entity`, `action`, `created_at`, `actor_user_id`)

**2. Interface completa — `src/pages/settings/AuditLogsView.tsx`** (reescrever)

Filtros avançados:
- **Período de data** — date range picker (de/até)
- **Usuário específico** — dropdown com usuários do tenant (busca de `profiles`)
- **Tipo de ação** — dropdown: CREATE, UPDATE, DELETE, LOGIN, all
- **Entidade afetada** — dropdown com todas as entidades

Tabela rica:
- Colunas: Data/Hora, Usuário (nome completo, não UUID truncado), Entidade, Ação (com badge colorido), Detalhes
- Ao expandir: **diff visual** destacando campos alterados (verde = adicionado, vermelho = removido, amarelo = modificado) em vez de JSON bruto

Exportação:
- **CSV** com todos os campos incluindo before/after
- **JSON** com dados completos

Estatísticas resumidas no topo:
- Total de eventos no período
- Ações por tipo (badges com contagem)

**3. Interceptação automática de ações** — Melhorar o registro de logs nos pontos existentes do código, garantindo que as seguintes ações sejam capturadas:
- Login/logout (via `useAuth`)
- CRUD em tabelas principais (já parcialmente implementado via edge functions e código existente)

### Arquivos modificados
- Migração SQL (colunas + índices)
- `src/pages/settings/AuditLogsView.tsx` — reescrita completa
- `src/hooks/useAuth.tsx` — adicionar log de login/logout

