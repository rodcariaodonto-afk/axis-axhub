import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210 80% 55%)",
  "hsl(150 60% 45%)",
  "hsl(40 90% 55%)",
  "hsl(0 70% 55%)",
  "hsl(270 60% 55%)",
  "hsl(180 50% 45%)",
];

interface BIPieChartProps {
  data: { label: string; value: number }[];
}

export function BIPieChart({ data }: BIPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="70%" label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={11}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
