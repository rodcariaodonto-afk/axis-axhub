

# Ajustar Logo na Sidebar

## Mudanca

Modificar o `SidebarHeader` em `src/components/AppSidebar.tsx` para que a logo ocupe a largura disponivel sem aumentar a altura do cabecalho.

## Detalhes Tecnicos

**Arquivo:** `src/components/AppSidebar.tsx` (linhas 119-123)

**De:**
```tsx
<SidebarHeader className="p-4">
  <div className="flex items-center gap-2">
    <img src={axisLogo} alt="Axis" className="h-12" />
  </div>
</SidebarHeader>
```

**Para:**
```tsx
<SidebarHeader className="px-3 py-3">
  <div className="flex items-center justify-center">
    <img src={axisLogo} alt="Axis" className="w-full max-w-[180px] h-auto object-contain" />
  </div>
</SidebarHeader>
```

A logo passa de altura fixa (`h-12`) para largura responsiva (`w-full` com `max-w-[180px]`), ocupando quase todo o espaco horizontal sem forcar altura extra. O padding tambem e reduzido de `p-4` para `px-3 py-3`.

