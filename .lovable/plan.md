

# Plano: Expandir Nodes do Workflow Builder

## Problema
O catalogo de acoes do Workflow Builder esta incompleto em relacao a versao esperada. Faltam nodes de comunicacao granulares (enviar texto, enviar imagem, enviar documento, enviar audio) e o node existente de WhatsApp precisa de melhor usabilidade.

## Alteracoes

| Arquivo | Acao |
|---------|------|
| `src/components/workflows/workflowCatalog.ts` | Editar - adicionar novos nodes de acao |

## Novos Nodes a Adicionar na aba "Acoes"

| ID | Label | Campos configuráveis |
|----|-------|---------------------|
| `send_whatsapp_text` | Enviar texto WhatsApp | Sessao, Telefone, Mensagem (textarea) |
| `send_whatsapp_image` | Enviar imagem WhatsApp | Sessao, Telefone, URL da imagem, Legenda (opcional) |
| `send_whatsapp_document` | Enviar documento WhatsApp | Sessao, Telefone, URL do documento, Nome do arquivo |
| `send_whatsapp_audio` | Enviar audio WhatsApp | Sessao, Telefone, URL do audio |
| `send_sms` | Enviar SMS | Telefone, Mensagem |

## Ajuste no Node Existente
- O node `send_whatsapp_message` atual sera mantido como node generico
- Os novos nodes oferecem acoes mais especificas e granulares para cada tipo de midia

## Detalhes Tecnicos
- Cada novo node segue o padrao `CatalogItem` existente com `configFields` tipados
- Icones: `MessageSquare` para texto, `Image` para imagem, `FileText` para documento, `Mic` para audio, `Smartphone` para SMS
- Todos com `category: "action"`
- O painel de configuracoes (WorkflowSettingsPanel) ja renderiza todos os tipos de campo automaticamente, nenhuma alteracao necessaria la

