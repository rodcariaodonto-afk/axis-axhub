# Corrigir erros de TypeScript em 6 componentes

Os erros têm duas causas raiz:

1. **Inferência de tipos do Zod** — `result.data` é inferido com propriedades opcionais (por causa de `strictNullChecks: false`), mas as funções `mutateAsync` exigem tipos com campos obrigatórios (`SavePJBankInput`, `UpsertDocumentTypeInput`, `SaveCriteriaInput`, `SaveTaxSettingsInput`).
2. **Prop `title` em ícones Lucide** — `lucide-react` não aceita `title` como prop; precisa ser envolto num `<span title="...">`.

## Mudanças

### 1. `PJBankDataForm.tsx` (linha 95)
Adicionar cast para `SavePJBankInput`:
```ts
await save.mutateAsync({ ...result.data, id: editing?.id } as SavePJBankInput & { id?: string });
```
Importar o tipo `SavePJBankInput` do hook se ainda não estiver importado.

### 2. `EvaluationCriteriaConfig.tsx` (linha 97)
```ts
await save.mutateAsync({ ...result.data, id: editing?.id } as SaveCriteriaInput);
```

### 3. `DocumentTypeConfig.tsx` (linhas 81 e 84)
```ts
await update.mutateAsync({ id: editing.id, ...result.data } as UpsertDocumentTypeInput & { id: string });
await create.mutateAsync(result.data as Omit<UpsertDocumentTypeInput, "id">);
```
Importar `UpsertDocumentTypeInput` se necessário.

### 4. `TaxSettingsForm.tsx` (linha 102)
```ts
const input = { pjId, ...result.data } as SaveTaxSettingsInput;
```

### 5. `ContractVigencyDashboard.tsx` (linha 186) e `PJContractsList.tsx` (linha 115)
Trocar `<RefreshCw ... title="..." />` por:
```tsx
<span title="...">
  <RefreshCw className="h-4 w-4 text-green-500 mx-auto" />
</span>
```

Não há mudanças de lógica de negócio — apenas alinhamento de tipos e remoção de prop inválida.
