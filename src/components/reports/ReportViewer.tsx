import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ReportData } from "./reportDataGenerators";
import type { ChartType } from "./reportTemplates";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(210 80% 55%)",
  "hsl(280 60% 55%)",
  "hsl(30 80% 55%)",
  "hsl(160 60% 45%)",
  "hsl(0 70% 55%)",
];

interface Props {
  data: ReportData;
  chartType: ChartType;
  title: string;
}

export function ReportViewer({ data, chartType, title }: Props) {
  const chartData = data.labels.map((label, i) => {
    const point: Record<string, any> = { name: label };
    data.datasets.forEach((ds) => { point[ds.label] = ds.data[i] || 0; });
    return point;
  });

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {data.summary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.summary.map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartType !== "table" && chartData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {data.datasets.map((ds, i) => (
                    <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {data.datasets.map((ds, i) => (
                    <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                  ))}
                </LineChart>
              ) : (
                <PieChart>
                  <Pie data={chartData} dataKey={data.datasets[0]?.label || "value"} nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, value }) => `${name}: ${value}`}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {data.tableData && data.tableData.length > 0 ? (
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dados Detalhados</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  {Object.keys(data.tableData[0]).map((key) => (
                    <TableHead key={key}>{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tableData.map((row, i) => (
                  <TableRow key={i} className="border-border">
                    {Object.values(row).map((val, j) => (
                      <TableCell key={j}>{String(val)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : chartType === "table" && chartData.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Nome</TableHead>
                  {data.datasets.map((ds) => (
                    <TableHead key={ds.label} className="text-right">{ds.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((row, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="font-medium">{row.name}</TableCell>
                    {data.datasets.map((ds) => (
                      <TableCell key={ds.label} className="text-right">
                        {typeof row[ds.label] === "number" ? row[ds.label].toLocaleString("pt-BR") : row[ds.label]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
