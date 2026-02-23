import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BIBarChart } from "./charts/BIBarChart";
import { BILineChart } from "./charts/BILineChart";
import { BIPieChart } from "./charts/BIPieChart";
import { BIKpiCard } from "./charts/BIKpiCard";

interface WidgetWrapperProps {
  widget: {
    id: string;
    title: string;
    chart_type: string;
    metric: string;
    dimension: string;
    aggregation: string;
  };
  dateFrom?: string;
  dateTo?: string;
  isEditing: boolean;
  onDelete: (id: string) => void;
}

export function WidgetWrapper({ widget, dateFrom, dateTo, isEditing, onDelete }: WidgetWrapperProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["bi-widget", widget.id, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("execute_bi_widget_query", {
        p_metric: widget.metric,
        p_dimension: widget.dimension,
        p_aggregation: widget.aggregation,
        p_date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
        p_date_to: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : null,
      });
      if (error) throw error;
      return (data as { label: string; value: number }[]) || [];
    },
  });

  const chartData = data || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        {isEditing && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(widget.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px]">
        {isLoading ? (
          <Skeleton className="w-full h-full min-h-[200px]" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados para exibir</div>
        ) : widget.chart_type === "bar" ? (
          <BIBarChart data={chartData} />
        ) : widget.chart_type === "line" ? (
          <BILineChart data={chartData} />
        ) : widget.chart_type === "pie" ? (
          <BIPieChart data={chartData} />
        ) : widget.chart_type === "kpi" ? (
          <BIKpiCard data={chartData} title={widget.title} />
        ) : (
          <BIBarChart data={chartData} />
        )}
      </CardContent>
    </Card>
  );
}
