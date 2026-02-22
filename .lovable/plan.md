
# Integrar Funil de Venda a uma Campanha

## Resumo
Adicionar a possibilidade de vincular um funil de venda a uma campanha WhatsApp. Quando a campanha for iniciada, os contatos passarao pelo fluxo do funil vinculado em vez de apenas receber a mensagem template direta.

## O que sera feito

### 1. Banco de dados
- Adicionar coluna `funil_id` (UUID, nullable) na tabela `campanhas`, referenciando `funis.id`

### 2. Frontend - Configuracoes da Campanha
- No componente `CampaignSettings.tsx`, adicionar um seletor de "Funil de Venda" (opcional)
- Buscar a lista de funis do tenant e exibir em um dropdown
- Quando um funil estiver vinculado, mostrar um indicador visual

### 3. Frontend - Criacao de Campanha
- No dialog de criacao em `Campanhas.tsx`, adicionar campo opcional para selecionar um funil

### 4. Interface da Campanha
- Atualizar a interface `Campaign` em `Campanhas.tsx` para incluir `funil_id`

## Detalhes tecnicos

### Migracao SQL
```sql
ALTER TABLE public.campanhas ADD COLUMN funil_id uuid REFERENCES public.funis(id) ON DELETE SET NULL;
```

### Arquivos modificados
- `src/pages/Campanhas.tsx` - Adicionar `funil_id` na interface e no formulario de criacao
- `src/components/campanhas/CampaignSettings.tsx` - Adicionar seletor de funil com query aos funis existentes

### Fluxo do usuario
```text
1. Cria ou edita uma campanha
2. Nas configuracoes, seleciona um funil (opcional)
3. Ao iniciar a campanha, os contatos entram no fluxo do funil
4. Pode remover o vinculo a qualquer momento selecionando "Nenhum"
```
