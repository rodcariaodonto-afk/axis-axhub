
## Corrigir o erro da Agenda do Google Calendar

### Diagnóstico
O erro não está vindo do Google nem da URL publicada. Pelo que eu verifiquei:

- As requisições da agenda estão saindo da origem de preview do editor: `*.lovableproject.com`
- Elas falham com `Failed to fetch` antes mesmo de chegar nas funções
- Não há erro de runtime nem logs da função sendo executada nesse fluxo
- A URI publicada `https://axis-axhub.lovable.app/agenda` já está correta para o uso real

Isso indica um problema do ambiente de preview com chamadas autenticadas da agenda, não um problema principal da integração em si.

### O que vou ajustar
**Arquivo principal:** `src/pages/Agenda.tsx`

1. **Detectar ambiente de preview/editor**
   - Identificar quando a página estiver rodando em domínio de preview/editor
   - Ex.: `lovableproject.com` / preview temporário

2. **Bloquear o fluxo de conexão no preview**
   - Não tentar chamar `google-calendar-auth` nem `google-calendar-sync` no preview
   - Evitar o erro visual `Failed to fetch`

3. **Mostrar orientação correta no lugar do erro**
   - Exibir um aviso claro:
     - que a conexão do Google Calendar deve ser feita na URL publicada
     - que a URL correta é `https://axis-axhub.lovable.app/agenda`
   - Adicionar botão/link para abrir a agenda publicada

4. **Melhorar tratamento de erro**
   - Quando houver falha de rede nesse contexto, trocar a mensagem genérica por algo útil
   - Ex.: “Abra a agenda na versão publicada para conectar e sincronizar o Google Calendar”

5. **Manter o fluxo normal na versão publicada**
   - Na URL publicada, a agenda continua:
     - conectando via OAuth
     - listando eventos
     - criando/editando/excluindo
     - sincronizando com o Google

### O que não precisa mudar
- Não precisa alterar CORS
- Não precisa mudar as funções de backend por causa desse erro específico
- Não precisa trocar a redirect URI já configurada para a versão publicada
- Não precisa mexer no banco

### Validação após ajuste
1. Abrir `https://axis-axhub.lovable.app/agenda`
2. Clicar em conectar Google Calendar
3. Autorizar a conta `rodrigo.axhub@gmail.com`
4. Confirmar:
   - agenda carrega eventos
   - criar evento no AXIS aparece no Google
   - criar/editar evento no Google aparece no AXIS após atualização/sincronização
5. Confirmar também que no preview não aparece mais o erro vermelho, e sim a orientação para usar a URL publicada

### Detalhes técnicos
- O problema atual acontece porque o preview está chamando as funções a partir de uma origem temporária do editor
- A evidência é que as requests falham com `Failed to fetch` e não chegam a gerar erro de execução nas funções
- A correção ideal aqui é **UX + detecção de ambiente**, não reconfiguração da integração
