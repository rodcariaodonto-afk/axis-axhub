

## Adicionar Busca e Filtro de Visualização (Dia/Semana/Mês) na Agenda

### Arquivo modificado
**`src/pages/Agenda.tsx`**

### Mudanças

**1. Novo estado `viewMode`** — `"day" | "week" | "month"` (padrão: `"month"`)

**2. Campo de busca + toggle de visualização** — entre o título "Agenda" e o calendário:
- Input de busca que filtra eventos pelo `summary` (título)
- 3 botões toggle: **Dia / Semana / Mês** (usando botões com estilo ativo/inativo)

**3. Lógica de visualização condicional:**

- **Mês** (atual): grid 7 colunas com todos os dias do mês, como já funciona
- **Semana**: grid 7 colunas mostrando apenas os 7 dias da semana selecionada (baseada em `selectedDate`), com mais espaço vertical por dia para listar mais eventos
- **Dia**: visualização expandida do dia selecionado, mostrando todos os eventos com horários em formato de lista detalhada

**4. Busca:**
- Filtrar `events` pelo texto digitado (case-insensitive no `summary`)
- Aplicar filtro tanto na grid do calendário quanto no painel lateral

**5. Navegação adaptada ao modo:**
- No modo Mês: setas navegam meses (como hoje)
- No modo Semana: setas navegam semanas (±7 dias)
- No modo Dia: setas navegam dias (±1 dia)
- Label do header muda conforme o modo (ex: "01–07 Abr 2026" para semana, "02 Abril 2026" para dia)

### Detalhes técnicos
- Imports adicionais de `date-fns`: `startOfDay`, `endOfDay`, `addWeeks`, `subWeeks`, `subDays`
- Busca local (sem chamada de API), apenas filtra o array `events` já carregado
- O `fetchEvents` continua buscando o mês inteiro para ter dados disponíveis em todos os modos

