

## Padronização de Campos de Endereço e Documento em toda a Plataforma

### Páginas afetadas

| Página | CPF/CNPJ | CEP/Cidade/Estado | Observação |
|--------|----------|-------------------|------------|
| `Accounts.tsx` | ✅ já tem máscara | ✅ já tem AddressFields | Já implementado |
| `AccountDetail.tsx` | ✅ já tem máscara | ✅ já tem AddressFields | Já implementado |
| `Customers.tsx` | Campo `document` sem máscara | Sem campos de endereço | Adicionar máscara CPF/CNPJ |
| `Suppliers.tsx` | Campo `cnpj` sem máscara | Sem campos de endereço | Adicionar máscara CNPJ |
| `Contacts.tsx` (converter) | Campo `document` sem máscara | Sem campos de endereço | Adicionar máscara CPF/CNPJ |
| `CompanyGeneral.tsx` | Campo `cnpj` sem máscara | Campo `address` texto livre | Adicionar máscara CNPJ |

### O que será feito

**1. Criar utilitário de máscara CPF/CNPJ** (`src/lib/documentMask.ts`)
- Função `formatDocument(value)`: detecta CPF (11 dígitos) ou CNPJ (14 dígitos) e aplica máscara automaticamente
  - CPF: `000.000.000-00`
  - CNPJ: `00.000.000/0001-00`
- Função `stripDocument(value)`: remove formatação para salvar no banco

**2. `Customers.tsx`** — Máscara no campo CPF/CNPJ
- Aplicar `formatDocument` no onChange do campo `document`
- Exibir valor formatado na tabela de listagem

**3. `Suppliers.tsx`** — Máscara no campo CNPJ
- Aplicar `formatDocument` no onChange do campo `cnpj`
- Exibir valor formatado na tabela

**4. `Contacts.tsx`** — Máscara no campo CPF/CNPJ do dialog "Converter em Cliente"
- Aplicar `formatDocument` no onChange do campo `document`

**5. `CompanyGeneral.tsx`** — Máscara no campo CNPJ
- Aplicar `formatDocument` no onChange do campo `cnpj`

### Arquivos modificados
- `src/lib/documentMask.ts` — novo utilitário
- `src/pages/Customers.tsx` — máscara CPF/CNPJ + formatação na listagem
- `src/pages/Suppliers.tsx` — máscara CNPJ + formatação na listagem
- `src/pages/Contacts.tsx` — máscara no dialog de conversão
- `src/pages/settings/CompanyGeneral.tsx` — máscara CNPJ

### Nota
As páginas `Accounts.tsx` e `AccountDetail.tsx` já possuem CEP automático, dropdowns de cidade/estado e máscara de documento — não serão alteradas. As demais páginas (Customers, Suppliers, Contacts, CompanyGeneral) não possuem campos de endereço no banco de dados, então a melhoria se limita à máscara de CPF/CNPJ.

