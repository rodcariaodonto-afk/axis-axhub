import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BIKpiCardProps {
  data: { label: string; value: number }[];
  title: string;
}

export function BIKpiCard({ data, title }: BIKpiCardProps) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  const formatted = total.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  // Simple trend: compare first half vs second half
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.value, 0);
  const secondHalf = data.slice(mid).reduce((s, d) => s + d.value, 0);
  const trend = secondHalf > firstHalf ? "up" : secondHalf < firstHalf ? "down" : "stable";

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <span className="text-sm text-muted-foreground font-medium">{title}</span>
      <span className="text-4xl font-bold text-foreground">{formatted}</span>
      <div className="flex items-center gap-1 text-sm">
        {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
        {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
        {trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
        <span className={trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}>
          {trend === "up" ? "Em alta" : trend === "down" ? "Em queda" : "Estável"}
        </span>
      </div>
    </div>
  );
}
