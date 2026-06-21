## Deploy das Edge Functions `validate-nf-xml` e `validate-nf-sefaz`

### Objetivo
Realizar o deploy imediato das duas edge functions existentes em `supabase/functions/`:
- `validate-nf-xml`
- `validate-nf-sefaz`

### Passos
1. Verificar existência dos diretórios (já confirmado: ambos existem).
2. Executar deploy via `supabase--deploy_edge_functions`.
3. Confirmar sucesso do deploy.

### Notas
- Nenhuma alteração de código será feita.
- O deploy é de backend e, portanto, entra em vigor automaticamente após a conclusão.