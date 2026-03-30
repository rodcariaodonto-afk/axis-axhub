

## Suporte Internacional no Endereço (Países, Estados, Cidades)

### Problema
O componente `AddressFields` só lista estados brasileiros (hardcoded) e cidades via API IBGE. Para clientes internacionais (ex: Angola), não há opções válidas.

### Solução
Tornar o campo País um **dropdown com todos os países do mundo** e adaptar estados/cidades conforme o país selecionado:

- **Brasil**: mantém comportamento atual (CEP via ViaCEP, estados dropdown, cidades via IBGE)
- **Outros países**: estados e cidades viram **campos de texto livre** (não existe API universal confiável para subdivisões de todos os países)
- CEP só faz auto-preenchimento quando país = "Brasil"

### Mudanças

**1. `src/hooks/useAddressCep.ts`**
- Exportar lista `COUNTRIES` com ~195 países (nome em português, código ISO)

**2. `src/components/address/AddressFields.tsx`**
- Trocar campo País de `Input` para `Select` com todos os países
- Quando país ≠ "Brasil":
  - Ocultar auto-preenchimento de CEP
  - Estado → Input texto livre (label "Estado / Província")
  - Cidade → Input texto livre
- Quando país = "Brasil": manter dropdown de estados + cidades IBGE
- Ao mudar de país, limpar estado e cidade

### Arquivos modificados
- `src/hooks/useAddressCep.ts` — adicionar lista de países
- `src/components/address/AddressFields.tsx` — dropdown de países + lógica condicional

