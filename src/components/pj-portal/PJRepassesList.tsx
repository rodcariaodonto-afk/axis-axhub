import { useState } from "react";
import { DollarSign, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePJRepasses } from "@/hooks/usePJRepasses";
import { usePJSession } from "./PJPortalLayout";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente:  { label: "Pendente",  className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  aprovado:  { label: "Aprovado",  className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  pago:      { label: "Pago",      className: "bg-green-500/15 text-green-600 border-green-500/30" },
  cancelado: { label: "Cancelado", className: "bg-red-500/15 text-red-500 border-red-500/30" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

export default function PJRepassesList() {
  const { tenantId, pjId } = usePJSession();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("todos");

  const { data: repasses = [], isLoading } = usePJRepasses(tenantId, pjId, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: status !== "todos" ? status : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Repasses</h1>
        <p className="text-muted-foreground">Histórico de repasses financeiros</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border border-border bg-card/50">
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Data inicial</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Data final</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Carregando repasses...
        </div>
      ) : repasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <DollarSign className="h-10 w-10 opacity-30" />
          <p>Nenhum repasse encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Comprovante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repasses.map((repasse) => (
                <TableRow key={repasse.id} className="border-border hover:bg-accent/20">
                  <TableCell className="text-sm">
                    {format(parseISO(repasse.data_repasse + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(repasse.valor)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={repasse.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    {repasse.comprovante_url ? (
                      <a
                        href={repasse.comprovante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
