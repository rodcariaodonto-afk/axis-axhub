
# Correcao: Contatos de Campanha Nao Aparecem

## Problema Identificado

A tabela `campanhas_contatos` **nao possui a coluna `created_at`**, mas o componente `CampaignContactList` tenta ordenar por essa coluna:

```
.order("created_at", { ascending: false })
```

Isso faz a query de SELECT falhar silenciosamente -- o contato e inserido com sucesso (por isso aparece o toast "Contato adicionado!"), mas a listagem retorna vazia porque a query de busca quebra.

## Sobre os Funis

Analisando os dados de rede, os blocos do funil (incluindo as mensagens configuradas nos gatilhos) **estao sendo salvos corretamente** no banco (status 201). Se houver algum problema especifico ao reabrir o funil e as mensagens nao aparecerem, pode ser um problema separado -- mas os dados estao persistindo.

## Solucao

### 1. Adicionar coluna `created_at` na tabela `campanhas_contatos`

Criar uma migracao SQL para adicionar a coluna que esta faltando:

```sql
ALTER TABLE public.campanhas_contatos
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
```

### 2. Melhorar tratamento de erros no `CampaignContactList`

No arquivo `src/components/campanhas/CampaignContactList.tsx`, adicionar verificacao de erro nas operacoes de insert para que, se algo falhar, o usuario receba feedback claro em vez de um toast falso de sucesso.

---

## Resumo Tecnico

| Mudanca | Arquivo | Tipo |
|---|---|---|
| Adicionar coluna `created_at` | Migracao SQL | Banco de dados |
| Verificar erros no insert/bulkAdd | `src/components/campanhas/CampaignContactList.tsx` | Codigo |
