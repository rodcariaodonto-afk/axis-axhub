import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePJContracts } from "@/hooks/usePJContracts";
import { usePJSession } from "./PJPortalLayout";
import { cn } from "@/lib/utils";

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR });
}

type VigencyStatus = "vencido" | "vencendo" | "vigente" | "sem_vigencia";

function getVigencyStatus(endDate: string | null): VigencyStatus {
  if (!endDate) return "sem_vigencia";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISO(endDate);
  if (isBefore(end, today)) return "vencido";
  if (isBefore(end, addDays(today, 30))) return "vencendo";
  return "vigente";
}

const VIGENCY_CONFIG: Record<VigencyStatus, { label: string; className: string }> = {
  vencido:      { label: "Vencido",         className: "bg-red-500/15 text-red-500 border-red-500/30" },
  vencendo:     { label: "Vence em 30d",    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  vigente:      { label: "Vigente",         className: "bg-green-500/15 text-green-600 border-green-500/30" },
  sem_vigencia: { label: "Sem vigência",    className: "bg-muted text-muted-foreground border-border" },
};

export default function PJContractsList() {
  const { tenantId, pjId } = usePJSession();
  const { data: contracts = [], isLoading } = usePJContracts(tenantId, pjId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
        <p className="text-muted-foreground">Seus contratos vigentes e histórico</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Carregando contratos...
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <FileText className="h-10 w-10 opacity-30" />
          <p>Nenhum contrato encontrado</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40">
                <TableHead className="w-8" />
                <TableHead>Nome</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Término</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Auto-renova</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const vigency = getVigencyStatus(contract.end_date);
                const vc = VIGENCY_CONFIG[vigency];
                const isExpanded = expandedId === contract.id;

                return (
                  <>
                    <TableRow
                      key={contract.id}
                      className={cn(
                        "cursor-pointer border-border transition-colors",
                        isExpanded ? "bg-accent/40" : "hover:bg-accent/20"
                      )}
                      onClick={() => toggle(contract.id)}
                    >
                      <TableCell className="w-8 pr-0">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell className="font-medium">{contract.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-medium", vc.className)}>
                          {vc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground capitalize">{contract.status}</span>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(contract.start_date)}</TableCell>
                      <TableCell className="text-sm">{formatDate(contract.end_date)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(contract.value)}</TableCell>
                      <TableCell className="text-center">
                        {contract.auto_renew ? (
                          <RefreshCw className="h-4 w-4 text-green-500 mx-auto" title="Renovação automática ativa" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow key={`${contract.id}-detail`} className="bg-accent/10 border-border">
                        <TableCell colSpan={8} className="py-4 px-8">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground block mb-0.5">Tipo</span>
                              <span>{contract.contract_type ?? "—"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block mb-0.5">Valor</span>
                              <span>{formatCurrency(contract.value)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block mb-0.5">Renovação automática</span>
                              <span>{contract.auto_renew ? "Sim" : "Não"}</span>
                            </div>
                            {contract.description && (
                              <div className="col-span-2 md:col-span-3">
                                <span className="text-muted-foreground block mb-0.5">Descrição</span>
                                <span className="text-foreground/80">{contract.description}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
