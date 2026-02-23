
# Correcao: Mensagens nao entregues e funis travados

## Diagnostico dos Logs

Analisando os logs reais da funcao `process-funnel-block`, encontrei a causa raiz:

### A Evolution API rejeitou TODOS os envios

```
Response: ok=false status=400
body: {"status":400,"error":"Bad Request","response":{"message":[
  {"jid":"119838647070@s.whatsapp.net","exists":false,"number":"119838647070"}
]}}
```

O numero `119838647070` esta sem o codigo do pais `55`. A Evolution API nao encontra o contato no WhatsApp e retorna `exists: false`.

### O fluxo para no "Aguardar Resposta"

Como a primeira mensagem falhou silenciosamente (o codigo nao trata o `res.ok === false` como erro), o bloco avanca para "Aguardar Resposta" e fica esperando eternamente uma resposta que nunca vira.

## Solucao (3 correcoes)

### 1. Adicionar codigo do pais `55` automaticamente

No `process-funnel-block`, ao formatar o telefone, garantir que numeros brasileiros recebam o prefixo `55`:

```
let phone = execucao.contato_telefone.replace(/\D/g, "");
if (!phone.startsWith("55") && phone.length >= 10 && phone.length <= 11) {
  phone = "55" + phone;
}
```

### 2. Tratar falha de envio como erro

Quando `res.ok === false`, o bloco deve registrar o erro e marcar a execucao como `erro` em vez de avancar silenciosamente:

```
if (!res.ok) {
  blockStatus = "erro";
  detalhes = { error: "Message send failed", ... };
  // Marcar execucao como erro
}
```

### 3. Reconhecer bloco `inicio_campanha` como trigger

Adicionar o tipo `inicio_campanha` no switch para que ele seja processado corretamente (apenas registrar log e avancar para o proximo bloco).

### 4. Limpar execucoes travadas

Atualizar as 4 execucoes atuais de "em_andamento" para "erro" para limpar o dashboard.

## Resumo tecnico

| Mudanca | Arquivo | Descricao |
|---|---|---|
| Prefixo 55 nos telefones | `process-funnel-block/index.ts` | Adicionar codigo do pais automaticamente |
| Tratar falha de envio | `process-funnel-block/index.ts` | Marcar como erro quando API rejeita |
| Tipo inicio_campanha | `process-funnel-block/index.ts` | Reconhecer como trigger valido |
| Limpar execucoes | Query SQL | Marcar travadas como erro |
