

# Correção do Disparo de Campanhas WhatsApp

## Problemas Identificados

### Problema 1: Método `getClaims` não existe
A Edge Function usa `supabase.auth.getClaims(token)` na linha 32, mas esse método **não existe** no Supabase JS SDK. Isso causa um erro imediato e a função falha silenciosamente. Deve ser substituído por `supabase.auth.getUser(token)`.

### Problema 2: Timeout da Edge Function
A função processa todos os contatos sequencialmente com delays de 2-5 segundos entre cada envio. Edge Functions têm limite de ~150 segundos. Com 30+ contatos e delays, a função ultrapassa esse limite e é encerrada sem completar o envio.

### Problema 3: CORS headers incompletos
Os headers CORS não incluem os headers do cliente Supabase (`x-supabase-client-platform`, etc.), o que pode causar falhas na chamada via `supabase.functions.invoke()`.

## Solução

### Arquitetura: Disparo Assíncrono sem Timeout

Em vez de processar todos os contatos em uma única chamada, a função será reestruturada para:

1. **Chamada inicial**: Marca campanha como "ativa", retorna imediatamente ao frontend
2. **Processamento em lote**: Usa `EdgeRuntime.waitUntil()` (Deno) para continuar processando em background após retornar a resposta
3. **Fallback de segurança**: Se o background também estourar, o frontend pode re-chamar a função e ela continua de onde parou (pois só processa contatos com status "pendente")

```text
Frontend clica "Iniciar"
  -> Edge Function valida auth + campanha
  -> Marca status "ativa"
  -> Retorna { ok: true } imediatamente
  -> Em background: processa contatos um a um com delay
  -> Se timeout: contatos restantes ficam "pendente"
  -> Frontend pode re-chamar para continuar
```

### Detalhes Tecnicos

**Arquivo modificado**: `supabase/functions/send-campaign-with-delay/index.ts`

Alteracoes:
1. Substituir `getClaims(token)` por `getUser(token)` para autenticacao
2. Adicionar headers CORS completos para compatibilidade com `supabase.functions.invoke()`
3. Usar pattern de resposta imediata + processamento em background via `waitUntil` (ou processar em lotes menores com auto-continuacao)
4. Adicionar logs com `console.log` para depuracao futura

**Arquivo modificado**: `src/pages/Campanhas.tsx`
- Melhorar feedback ao usuario: mostrar que a campanha esta sendo processada em background
- Adicionar polling ou refresh para atualizar status dos contatos

**Nao precisa alterar**: `supabase/config.toml` - a funcao ja e chamada com JWT via `supabase.functions.invoke()`, entao verify_jwt padrao (true) funciona.

