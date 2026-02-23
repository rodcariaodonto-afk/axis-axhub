import { WidgetWrapper } from "./WidgetWrapper";

interface Widget {
  id: string;
  title: string;
  chart_type: string;
  metric: string;
  dimension: string;
  aggregation: string;
}

interface DashboardGridProps {
  widgets: Widget[];
  tenantId: string;
  dateFrom?: string;
  dateTo?: string;
  isEditing: boolean;
  onDeleteWidget: (id: string) => void;
}

export function DashboardGrid({ widgets, tenantId, dateFrom, dateTo, isEditing, onDeleteWidget }: DashboardGridProps) {
  if (widgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
        <p className="text-muted-foreground">Nenhum widget adicionado. Clique em "Adicionar Widget" para começar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {widgets.map((widget) => (
        <div key={widget.id} className={widget.chart_type === "kpi" ? "" : "min-h-[300px]"}>
          <WidgetWrapper
            widget={widget}
            tenantId={tenantId}
            dateFrom={dateFrom}
            dateTo={dateTo}
            isEditing={isEditing}
            onDelete={onDeleteWidget}
          />
        </div>
      ))}
    </div>
  );
}
