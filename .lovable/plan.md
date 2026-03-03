
# Plano: Corrigir selecao de Funil de Venda na criacao de Campanha

## Problema Identificado

O componente `Select` do Radix UI recebe `value=""` (string vazia) como valor inicial para o campo de funil. Como nenhum `SelectItem` possui `value=""`, o componente entra em um estado inconsistente onde:
- O placeholder aparece mas o dropdown pode nao abrir ou nao selecionar corretamente
- O Radix Select trata `""` como um valor controlado valido, nao como "sem selecao"

Os funis existem no banco de dados (2 registros) e a RLS esta correta para o tenant do usuario.

## Correcao

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Campanhas.tsx` | Alterar valor inicial de `funil_id` para `"none"` e ajustar o `handleCreate` |

### Detalhes Tecnicos

1. **Linha 41** - Alterar o estado inicial do form: `funil_id: ""` para `funil_id: "none"`
2. **Linha 158** - Alterar o reset do form no botao "Nova Campanha": `funil_id: ""` para `funil_id: "none"`
3. **Linha 70** - No `handleCreate`, ja existe a logica `funil_id: form.funil_id || null`, mas precisa tambem tratar `"none"`: `funil_id: form.funil_id === "none" || !form.funil_id ? null : form.funil_id`

Isso alinha o comportamento com o que ja e feito no `CampaignSettings.tsx` (linha 71), que usa `value={funilId || "none"}`.
