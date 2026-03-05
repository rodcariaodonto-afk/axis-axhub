

## Avaliação: Transferência de Conversas WhatsApp

### Compatibilidade com o sistema atual

O documento propõe criar uma tabela `whatsapp_conversation_assignments` para controlar atribuições. Porém, **já existe** a tabela `whatsapp_contact_status` com os campos `assigned_to` e `status` que fazem exatamente isso. Criar uma tabela paralela causaria conflito com a lógica de visibilidade entre admins que acabamos de implementar.

**Minha recomendação:** adaptar o conceito do documento para usar a infraestrutura existente, adicionando apenas o que é realmente novo (filas e logs).

### O que é possível implementar sem quebrar nada

**1. Tabela `whatsapp_queues`** — Nova, sem conflito. Permite organizar atendentes em filas.

**2. Tabela `whatsapp_transfer_logs`** — Nova, sem conflito. Registra histórico de transferências para auditoria.

**3. Edge Function `transfer-whatsapp-conversation`** — Nova. Atualiza o `assigned_to` na tabela `whatsapp_contact_status` existente (em vez de criar tabela duplicada) e registra o log.

**4. UI: Botão "Transferir" no header do chat** — Aditivo. Abre modal com lista de usuários do tenant e filas. Ao confirmar, chama a edge function.

**5. Exibição do responsável** — Já implementado parcialmente (mostra "Atendente: nome" na lista de contatos).

### Mudanças concretas

| Componente | Ação | Risco |
|---|---|---|
| Migração SQL | Criar `whatsapp_queues` e `whatsapp_transfer_logs` | Nenhum (tabelas novas) |
| `whatsapp_contact_status` | Reutilizar `assigned_to` existente | Nenhum |
| Edge Function | Criar `transfer-whatsapp-conversation` | Nenhum (função nova) |
| `WhatsAppChat.tsx` | Adicionar botão "Transferir" + modal | Baixo (aditivo) |
| `WhatsApp.tsx` | Passar props extras (tenantId, profiles) ao chat | Baixo |
| Novo componente | `TransferConversationModal.tsx` | Nenhum (arquivo novo) |

### O que NÃO farei do documento original

- **NÃO** criar `whatsapp_conversation_assignments` — redundante com `whatsapp_contact_status`
- **NÃO** usar políticas RLS genéricas "Allow all" — usarei políticas baseadas em `tenant_id` com `get_user_tenant_id()`

### Arquivos modificados/criados
- Migração SQL (2 tabelas novas + RLS)
- `supabase/functions/transfer-whatsapp-conversation/index.ts`
- `src/components/whatsapp/TransferConversationModal.tsx` (novo)
- `src/components/whatsapp/WhatsAppChat.tsx` (botão transferir)
- `src/pages/WhatsApp.tsx` (passar props + handler)

