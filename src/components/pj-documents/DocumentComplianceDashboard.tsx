import { CheckCircle2, Clock, XCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useDocumentCompliance,
  COMPLIANCE_STATUS_CONFIG,
  type ComplianceStatus,
} from "@/hooks/useDocumentCompliance";

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  className: string;
  iconClassName: string;
}

function SummaryCard({ label, value, icon: Icon, className, iconClassName }: SummaryCardProps) {
  return (
    <Card className={cn("border", className)}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", iconClassName)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  onSelectPJ?: (pjId: string) => void;
}

export function DocumentComplianceDashboard({ onSelectPJ }: Props) {
  const { data: results = [], isLoading } = useDocumentCompliance();

  const total = results.length;
  const conformes = results.filter((r) => r.status === "conforme").length;
  const pendentes = results.filter((r) => r.status === "pendente").length;
  const naoConformes = results.filter((r) => r.status === "nao_conforme").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
        Calculando conformidade...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total de PJs"
          value={total}
          icon={Users}
          className="border-border"
          iconClassName="bg-primary/10 text-primary"
        />
        <SummaryCard
          label="Conformes"
          value={conformes}
          icon={CheckCircle2}
          className="border-green-500/30"
          iconClassName="bg-green-500/10 text-green-600"
        />
        <SummaryCard
          label="Com pendência"
          value={pendentes}
          icon={Clock}
          className="border-yellow-500/30"
          iconClassName="bg-yellow-500/10 text-yellow-600"
        />
        <SummaryCard
          label="Docs vencidos"
          value={naoConformes}
          icon={XCircle}
          className="border-red-500/30"
          iconClassName="bg-red-500/10 text-red-500"
        />
      </div>

      {/* Table */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Nenhum PJ ativo encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead>PJ</TableHead>
                <TableHead className="text-center">Obrigatórios</TableHead>
                <TableHead className="text-center">Entregues</TableHead>
                <TableHead className="text-center">Vencidos</TableHead>
                <TableHead className="text-center">Pendentes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => {
                const cfg = COMPLIANCE_STATUS_CONFIG[r.status];
                const clickable = !!onSelectPJ;
                return (
                  <TableRow
                    key={r.pjId}
                    className={cn("border-border hover:bg-accent/20", clickable && "cursor-pointer")}
                    onClick={() => onSelectPJ?.(r.pjId)}
                  >
                    <TableCell className="font-medium">{r.pjName ?? r.pjId}</TableCell>
                    <TableCell className="text-center text-sm">{r.totalMandatory}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("text-sm font-medium", r.delivered === r.totalMandatory && r.totalMandatory > 0 ? "text-green-600" : "")}>
                        {r.delivered}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.expired > 0 ? (
                        <span className="text-sm font-medium text-red-500">{r.expired}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.missing > 0 ? (
                        <span className="text-sm font-medium text-yellow-600">{r.missing}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
