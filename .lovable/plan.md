

## Adicionar Suporte a NIF em Todos os Campos de Documento

### Arquivos a modificar

**1. `src/lib/documentMask.ts`** — Centralizar lógica
- Adicionar função `detectDocumentType(value): "cpf" | "cnpj" | "nif"` (11 dígitos = CPF, 14 = CNPJ, outro = NIF)
- Atualizar `formatDocument` para retornar o valor sem máscara quando NIF (apenas dígitos)

**2. `src/pages/Accounts.tsx`**
- Expandir tipo de `"cpf" | "cnpj"` para `"cpf" | "cnpj" | "nif"` no estado `docType`
- Adicionar `<SelectItem value="nif">NIF</SelectItem>` no Select de tipo de documento
- Atualizar `detectDocType` e `validateDoc` para aceitar NIF (sem validação de formato)
- Quando NIF, ocultar seção "Responsável pela Empresa" (assim como CPF)

**3. `src/pages/AccountDetail.tsx`**
- Mesmas mudanças: expandir tipo, adicionar opção NIF no Select, atualizar `detectDocType` e `validateDoc`

**4. `src/pages/Suppliers.tsx`**
- Adicionar estado `docType` (`"cnpj" | "cpf" | "nif"`, default `"cnpj"`)
- Trocar label fixa "CNPJ" por Select com 3 opções (CNPJ/CPF/NIF)
- Não aplicar máscara quando NIF

**5. `src/pages/Customers.tsx`**
- Adicionar estado `docType` ao formulário
- Trocar label "CPF/CNPJ" por Select com 3 opções (CPF/CNPJ/NIF)
- Não aplicar máscara quando NIF

### Detalhes técnicos
- NIF angolano: aceitar qualquer sequência de dígitos, sem máscara rígida
- Sem migração SQL necessária — campos de documento já são texto livre
- Placeholder do NIF: "Número de Identificação Fiscal"

