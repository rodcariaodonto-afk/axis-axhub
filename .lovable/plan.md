
# Corrigir botao "Criar Formulario Modelo"

## Problemas identificados
1. O botao so aparece quando nao existem formularios (`forms.length === 0`), sumindo apos o primeiro uso
2. A funcao `handleSeedForm` usa `supabase.from("profiles").select("tenant_id, id").single()` que depende do usuario logado -- outros usuarios podem nao ter perfil configurado corretamente

## Solucao

### 1. Manter botao sempre visivel
Remover a condicao `(!forms || forms.length === 0) && !isLoading` que esconde o botao. O botao ficara sempre disponivel para qualquer usuario criar o formulario modelo a qualquer momento.

### 2. Corrigir funcionalidade para todos os usuarios
A funcao `handleSeedForm` ja busca o `tenant_id` e `id` do perfil do usuario logado. O problema pode ser que outros usuarios nao tem registro na tabela `profiles`. Vou adicionar tratamento de erro mais claro e garantir que a funcao funcione para qualquer usuario autenticado que tenha perfil.

## Alteracoes

**Arquivo:** `src/pages/Forms.tsx`
- Linha 122: Remover a condicao condicional `{(!forms || forms.length === 0) && !isLoading && (` -- o botao sera renderizado sempre, sem condicao
- Adicionar toast de erro caso o perfil nao seja encontrado, orientando o usuario
