

# Integracao Nativa N8N - Endpoint WhatsApp no AXHUB

## Resumo

Criar uma edge function `whatsapp-webhook` que recebe webhooks do N8N com mensagens de WhatsApp, busca produtos no banco de dados, e retorna os dados formatados para o N8N reenviar via WhatsApp.

**Nota importante:** Este projeto usa Vite + React (nao Next.js), entao nao e possivel usar `pages/api/`. A solucao sera uma **backend function** (edge function) que faz exatamente o mesmo papel.

---

## Arquitetura

```text
WhatsApp -> N8N -> Edge Function (whatsapp-webhook) -> Busca no DB -> Resposta JSON -> N8N -> WhatsApp
```

---

## 1. Secret necessario

| Secret | Descricao |
|--------|-----------|
| `N8N_SIGNATURE` | Chave secreta compartilhada entre N8N e AXHUB para validar webhooks |

O `N8N_TOKEN` ja existe mas e usado para chamadas de saida. O `N8N_SIGNATURE` sera usado para validar chamadas de entrada.

---

## 2. Edge Function: `supabase/functions/whatsapp-webhook/index.ts`

A funcao ira:

1. **Validar seguranca**: Verificar header `X-N8N-Signature` contra o secret `N8N_SIGNATURE`
2. **Receber payload**: Esperar JSON com `{ phone, message, tenant_id }`
   - `tenant_id` e necessario para buscar produtos do tenant correto (multi-tenant)
3. **Extrair termo de busca**: Limpar a mensagem para extrair o nome/termo do produto
4. **Buscar no banco**: Query na tabela `products` usando `ilike` no campo `name` filtrado por `tenant_id`
5. **Retornar resposta formatada**:
   - Se encontrado: `{ phone, product_name, product_description, product_price, product_image_url }`
   - Se nao encontrado: `{ phone, error: "Produto nao encontrado" }`
   - Se multiplos: retorna lista dos primeiros 5 resultados

### Detalhes tecnicos

- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS (a requisicao vem do N8N, nao de um usuario autenticado)
- JWT verification desabilitado no `config.toml` (webhook externo, validacao via signature)
- CORS headers incluidos para compatibilidade
- Validacao de input: phone e message obrigatorios, limite de tamanho

---

## 3. Configuracao no `supabase/config.toml`

Adicionar entrada para desabilitar JWT na funcao (webhook externo):

```toml
[functions.whatsapp-webhook]
verify_jwt = false
```

---

## 4. Payload esperado do N8N

```json
{
  "phone": "5511999999999",
  "message": "Quero ver o produto Camiseta Azul",
  "tenant_id": "uuid-do-tenant"
}
```

O `tenant_id` precisa ser enviado pelo N8N porque a requisicao nao tem usuario autenticado. Alternativa: o N8N pode enviar um `api_key` da tabela `api_keys` e a funcao resolve o tenant a partir dela.

---

## 5. Resposta retornada ao N8N

**Produto encontrado (unico):**
```json
{
  "phone": "5511999999999",
  "found": true,
  "product": {
    "name": "Camiseta Azul",
    "description": "Camiseta 100% algodao",
    "price": 59.90,
    "image_url": "https://..."
  }
}
```

**Multiplos produtos encontrados:**
```json
{
  "phone": "5511999999999",
  "found": true,
  "products": [...]
}
```

**Nenhum produto:**
```json
{
  "phone": "5511999999999",
  "found": false,
  "message": "Nenhum produto encontrado para 'Camiseta Azul'"
}
```

---

## 6. Ordem de Implementacao

1. Solicitar o secret `N8N_SIGNATURE` ao usuario
2. Criar a edge function `supabase/functions/whatsapp-webhook/index.ts`
3. Atualizar `supabase/config.toml` para desabilitar JWT na funcao (nota: este arquivo e gerenciado automaticamente, entao a configuracao sera feita via codigo da funcao)
4. Testar o endpoint com curl
5. Documentar no chat como configurar o workflow no N8N

---

## 7. Como usar no N8N

O usuario devera configurar no N8N:

1. **Trigger**: Webhook do WhatsApp (recebe mensagem)
2. **HTTP Request node**: POST para `https://dgybxarkvmaajfeesqdv.supabase.co/functions/v1/whatsapp-webhook` com headers `X-N8N-Signature` e body com phone + message + tenant_id
3. **WhatsApp node**: Envia a resposta formatada de volta ao usuario

