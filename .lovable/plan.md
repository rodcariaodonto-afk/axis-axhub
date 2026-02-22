

# Integracao Total da Plataforma AXIS - Itens Pendentes

## Analise do que ja existe vs o que falta

### FASE 1: WhatsApp x Funis de Venda
| Item | Status |
|------|--------|
| Tabelas do banco (funis, funis_blocos, etc.) | Pronto |
| Canvas visual (FunnelEditor, paleta, nodes) | Pronto |
| Vinculo funil x campanha (funil_id) | Pronto |
| Edge Functions do motor do funil (start-funnel-execution, process-funnel-queue) | **PENDENTE** |
| Edge Function save-funnel / get-funnel-details | **PENDENTE** |

### FASE 2: WhatsApp x Workflows e Campanhas
| Item | Status |
|------|--------|
| Campanha com delay (send-campaign-with-delay) | Pronto |
| Configuracoes de delay (campanhas_configuracoes) | Pronto |
| Colunas WhatsApp no workflows (whatsapp_trigger_config, whatsapp_action_config) | **PENDENTE** |
| Gatilho "Mensagem recebida no WhatsApp" no Workflow Builder | **PENDENTE** |
| Acao "Enviar mensagem via WhatsApp" no Workflow Builder | **PENDENTE** |
| Edge Functions (handle-workflow-whatsapp-trigger, execute-workflow-whatsapp-action) | **PENDENTE** |

### FASE 3: WhatsApp x CRM x Kanban
| Item | Status |
|------|--------|
| Coluna whatsapp_jid na tabela contacts | **PENDENTE** |
| Tabela mensagens_historico | **PENDENTE** |
| Edge Function sync-whatsapp-contact-to-crm | **PENDENTE** |
| Aba "Historico WhatsApp" no CRM (contatos/leads) | **PENDENTE** |
| Aba "WhatsApp" no modal do Kanban | **PENDENTE** |
| Coluna observacoes no deals | Pronto |

---

## Plano de Implementacao

Devido ao volume de mudancas, a implementacao sera dividida em 3 etapas sequenciais.

### Etapa A - Banco de Dados (Migracao SQL)

Uma unica migracao com todas as alteracoes estruturais:

1. Adicionar `whatsapp_jid` (VARCHAR, nullable) na tabela `contacts`
2. Criar tabela `mensagens_historico` com colunas: id, tenant_id, contato_id, deal_id, remetente, destinatario, mensagem, message_type, whatsapp_message_id, timestamp, created_at
3. Adicionar RLS na tabela `mensagens_historico` (tenant isolation)
4. As colunas de workflow (whatsapp_trigger_config, whatsapp_action_config) nao serao colunas separadas - o campo `definition` (JSONB) ja existente no workflows ja suporta qualquer tipo de no/acao, incluindo WhatsApp

### Etapa B - Edge Functions (Backend)

Criar 3 novas Edge Functions:

1. **start-funnel-execution** - Inicia a execucao de um funil para um contato, criando registro em `funis_execucoes` e processando o primeiro bloco
2. **process-funnel-block** - Processa um bloco especifico do funil (envia mensagem WhatsApp, aplica delay, avalia condicao) e avanca para o proximo bloco
3. **sync-whatsapp-contact-to-crm** - Chamada pelo webhook de WhatsApp quando uma mensagem chega, verifica/cria contato no CRM e salva em `mensagens_historico`

Modificar 1 Edge Function existente:
4. **whatsapp-evolution-webhook** - Adicionar chamada ao `sync-whatsapp-contact-to-crm` quando uma mensagem e recebida

### Etapa C - Frontend

1. **Workflow Builder** - Adicionar no catalogo:
   - Novo gatilho: "Mensagem recebida no WhatsApp" com config de sessao e palavra-chave
   - Nova acao: "Enviar mensagem via WhatsApp" com config de sessao, telefone e mensagem

2. **CardDetailModal (Kanban)** - Adicionar nova aba "WhatsApp" que:
   - Busca mensagens de `whatsapp_messages` filtradas pelo telefone/whatsapp_jid do contato associado ao deal
   - Exibe historico de mensagens em formato de timeline

3. **Pagina de Contatos/Leads** - Nao ha tela de detalhe individual de contato atualmente, entao a integracao do historico WhatsApp sera feita via o modal do Kanban (onde o contato e acessado pelo deal)

### Detalhes Tecnicos

**Migracao SQL:**
```text
- ALTER TABLE contacts ADD COLUMN whatsapp_jid VARCHAR;
- CREATE TABLE mensagens_historico (id, tenant_id, contato_id, deal_id, ...)
- RLS policies para mensagens_historico
```

**Arquivos modificados:**
- `src/components/workflows/workflowCatalog.ts` - 2 novos itens (trigger + action WhatsApp)
- `src/components/kanban/CardDetailModal.tsx` - Nova aba "WhatsApp" com historico
- `supabase/functions/whatsapp-evolution-webhook/index.ts` - Chamar sync ao CRM
- 3 novas Edge Functions em `supabase/functions/`

**Fluxo integrado resultante:**
```text
Mensagem WhatsApp recebida
  -> webhook salva mensagem
  -> sync-whatsapp-contact-to-crm cria/atualiza contato no CRM
  -> salva em mensagens_historico
  -> historico visivel no Kanban (aba WhatsApp do deal)

Workflow com gatilho WhatsApp
  -> mensagem recebida dispara workflow
  -> acao "Enviar WhatsApp" envia resposta automatica

Funil vinculado a campanha
  -> campanha inicia -> start-funnel-execution
  -> blocos processados sequencialmente (mensagens, delays, condicoes)
```

