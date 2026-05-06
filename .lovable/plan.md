Diagnóstico confirmado: o webhook está recebendo a mensagem e despachando o workflow; o `workflow-runner` está executando, mas a action `send_whatsapp_text` termina como `skipped / missing_fields` mesmo com `phone` e `message_text` presentes.

Problema provável: o `resolveTemplate` atual não resolve placeholders quando o valor do config não é uma string primitiva pura no runtime ou quando vem em formato diferente do esperado, fazendo `phone` ou `message` ficarem vazios na action.

Plano de correção:

1. Ajustar `supabase/functions/workflow-runner/index.ts`
   - Fortalecer a resolução dos campos `provider`, `phone`, `message` e `connection_id` da action `send_whatsapp_text`.
   - Garantir fallback explícito para `triggerData.phone`, `triggerData.message_text`, `triggerData.content` e `triggerData.text` quando o template resultar vazio.
   - Manter comportamento Evolution preservado.

2. Adicionar logs diagnósticos seguros no `workflow-runner`
   - Logar apenas presença/tamanho dos campos e provider, sem expor token.
   - Facilitar identificação de `missing_fields` em produção.

3. Redeploy da Edge Function `workflow-runner`
   - Publicar a versão corrigida.

4. Validar sem depender de você mandar outra mensagem
   - Chamar `workflow-runner` diretamente com payload Meta de teste.
   - Confirmar no banco que a etapa não retorna mais `missing_fields`; deve retornar `whatsapp_text_sent` ou erro real da Meta API caso o token/número tenham algum bloqueio externo.