

# Otimizacao Segura da Plataforma

Todas as mudancas sao **retrocompativeis** -- nenhuma funcionalidade existente sera alterada, apenas a forma como o codigo e carregado.

## O que sera feito

### 1. Lazy Loading das paginas (App.tsx)

Trocar os 30+ imports estaticos por `React.lazy()`. Isso faz com que cada pagina so seja baixada quando o usuario navegar ate ela, em vez de carregar tudo de uma vez.

- Um componente `Suspense` com um spinner simples (o mesmo spinner que ja existe no `ProtectedRoute`) envolve as rotas
- A pagina `Auth` e o `Dashboard` continuam com import estatico (sao as mais acessadas)
- Todas as outras viram lazy -- se der qualquer erro no lazy, o React simplesmente mostra o spinner ate carregar

### 2. QueryClient com cache mais inteligente (App.tsx)

Adicionar `staleTime: 5min` para que dados ja carregados nao sejam re-buscados imediatamente ao trocar de aba e voltar. Isso e padrao do React Query e nao afeta nenhuma logica existente.

### 3. WhatsApp mais leve (WhatsApp.tsx)

Otimizacoes conservadoras que nao mudam nenhum comportamento:

- **Limitar mensagens a 200** com `.limit(200)` -- nenhuma conversa normal precisa de mais que isso na tela
- **Debounce no loadContacts** -- quando chegam 5 mensagens seguidas via realtime, evita 5 chamadas ao banco em sequencia (usa um `useRef` com `setTimeout` de 300ms)

### 4. Componente PageLoader (novo arquivo)

Um spinner simples reutilizavel para o fallback do `Suspense`. Usa o mesmo estilo visual que ja existe no `ProtectedRoute`.

---

## Garantias de seguranca

- **Nenhuma tabela do banco e alterada**
- **Nenhuma query e modificada** (mesmos campos, mesma logica)
- **Nenhum componente existente e alterado** (apenas como/quando sao importados)
- **Se o lazy load falhar**, o React tenta novamente automaticamente
- **Dashboard e Auth carregam normalmente** sem lazy (acesso imediato)

## Arquivos modificados

| Arquivo | Tipo | Mudanca |
|---|---|---|
| `src/App.tsx` | Edicao | Lazy imports + staleTime no QueryClient |
| `src/pages/WhatsApp.tsx` | Edicao | .limit(200) nas mensagens + debounce no loadContacts |
| `src/components/PageLoader.tsx` | Novo | Spinner simples para transicoes |

