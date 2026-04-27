import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Scale,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { calculateBalance, BalanceSheetEntryLite } from "@/lib/financial/balanceCalculator";
import { fmt } from "@/lib/financial/dreCalculator";
import { BalanceSheetEntryDialog, BalanceSheetEntry } from "@/components/financial/BalanceSheetEntryDialog";

/**
 * Página Balanço Patrimonial
 *
 * Aba 1 (Calculado Automaticamente): Ativo, Passivo e PL derivados de bank_accounts,
 * receivables, payables e balance_sheet_entries.
 *
 * Aba 2 (Lançamentos Manuais): CRUD de balance_sheet_entries para registrar capital
 * social, reservas, ajustes contábeis ou itens não capturados automaticamente.
 *
 * Spec: docs/financeiro-contabil/spec.md secao 2.3 e 3.3
 */

const ENTRY_TYPE_LABELS: Record<string, string> = {
  ativo_circulante: "Ativo Circulante",
  ativo_nao_circulante: "Ativo Não Circulante",
  passivo_circulante: "Passivo Circulante",
  passivo_nao_circulante: "Passivo Não Circulante",
  patrimonio_liquido: "Patrimônio Líquido",
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  ativo_circulante: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-400",
  ativo_nao_circulante: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-400",
  passivo_circulante: "bg-gray-500/15 text-gray-700 border-gray-500/30 dark:text-gray-400",
  passivo_nao_circulante: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-400",
  patrimonio_liquido: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400",
};

export default function BalancoPatrimonial() {
  const today = new Date().toISOString().split("T")[0];
  const [referenceDate, setReferenceDate] = useState(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BalanceSheetEntry | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["balanco", referenceDate],
    queryFn: async () => {
      const [bankResult, recResult, payResult, manualResult] = await Promise.all([
        supabase.from("bank_accounts").select("balance"),
        supabase.from("receivables").select("amount, status, due_date, paid_at, accounting_type"),
        supabase.from("payables").select("amount, status, due_date, paid_at, accounting_type"),
        supabase.from("balance_sheet_entries").select("*").order("reference_date", { ascending: false }),
      ]);

      if (bankResult.error) throw bankResult.error;
      if (recResult.error) throw recResult.error;
      if (payResult.error) throw payResult.error;
      if (manualResult.error) throw manualResult.error;

      return {
        bankAccounts: bankResult.data || [],
        receivables: recResult.data || [],
        payables: payResult.data || [],
        manualEntries: (manualResult.data || []) as BalanceSheetEntry[],
      };
    },
  });

  const balance = useMemo(() => {
    if (!data) return null;
    return calculateBalance({
      referenceDate,
      bankAccounts: data.bankAccounts.map((b) => ({ balance: Number(b.balance ?? 0) })),
      receivables: data.receivables.map((r) => ({
        amount: Number(r.amount),
        status: r.status,
        due_date: r.due_date,
        paid_at: r.paid_at,
        accounting_type: r.accounting_type,
      })),
      payables: data.payables.map((p) => ({
        amount: Number(p.amount),
        status: p.status,
        due_date: p.due_date,
        paid_at: p.paid_at,
        accounting_type: p.accounting_type,
      })),
      manualEntries: data.manualEntries.map((e) => ({
        amount: Number(e.amount),
        entry_type: e.entry_type,
        reference_date: e.reference_date,
        account_name: e.account_name,
      })) as BalanceSheetEntryLite[],
    });
  }, [data, referenceDate]);

  const handleNew = () => {
    setEditEntry(null);
    setDialogOpen(true);
  };

  const handleEdit = (entry: BalanceSheetEntry) => {
    setEditEntry(entry);
    setDialogOpen(true);
  };

  const handleDelete = async (entry: BalanceSheetEntry) => {
    if (!entry.id) return;
    if (!confirm(`Excluir o lançamento "${entry.account_name}"? Esta ação não pode ser desfeita.`)) return;
    const { error: delError } = await supabase.from("balance_sheet_entries").delete().eq("id", entry.id);
    if (delError) {
      toast({ title: "Erro", description: delError.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lançamento excluído!" });
    queryClient.invalidateQueries({ queryKey: ["balanco"] });
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["balanco"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Balanço Patrimonial
          </h1>
          <p className="text-muted-foreground">
            Visão consolidada de Ativos, Passivos e Patrimônio Líquido
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Data de Referência</Label>
          <Input
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      )}

      {balance && data && (
        <>
          {/* Equação contábil */}
          <Card className={balance.equilibrado ? "border-green-500/30 bg-green-500/5" : "border-orange-500/30 bg-orange-500/5"}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {balance.equilibrado ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold">
                      {balance.equilibrado ? "Balanço Equilibrado" : "Balanço Desequilibrado"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ATIVO ({fmt(balance.ativoTotal)}) = PASSIVO + PL ({fmt(balance.passivoMaisPL)})
                    </span>
                  </div>
                  {!balance.equilibrado && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Diferença: <strong>{fmt(balance.diferenca)}</strong>. Para equilibrar, use a aba "Lançamentos Manuais"
                      para registrar Capital Social, Reservas ou ajustes contábeis.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="auto" className="space-y-4">
            <TabsList>
              <TabsTrigger value="auto">Calculado Automaticamente</TabsTrigger>
              <TabsTrigger value="manual">
                Lançamentos Manuais
                {data.manualEntries.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{data.manualEntries.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ATIVO */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg">ATIVO</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        <BalanceRow label="Ativo Circulante" value={balance.ativoCirculante} bold positive />
                        <BalanceRow label="Caixa e Equivalentes" value={balance.caixaEquivalentes} indent={1} />
                        <BalanceRow label="Contas a Receber (até 12m)" value={balance.contasReceber} indent={1} />
                        {balance.ativoCirculanteManual !== 0 && (
                          <BalanceRow label="Lançamentos Manuais" value={balance.ativoCirculanteManual} indent={1} muted />
                        )}
                        <BalanceRow label="Ativo Não Circulante" value={balance.ativoNaoCirculante} bold positive />
                        <BalanceRow label="Investimentos / Imobilizado" value={balance.investimentosImobilizado} indent={1} />
                        {balance.ativoNaoCirculanteManual !== 0 && (
                          <BalanceRow label="Lançamentos Manuais" value={balance.ativoNaoCirculanteManual} indent={1} muted />
                        )}
                        <BalanceRow label="TOTAL ATIVO" value={balance.ativoTotal} bold highlight />
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* PASSIVO + PL */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg">PASSIVO + PATRIMÔNIO LÍQUIDO</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        <BalanceRow label="Passivo Circulante" value={balance.passivoCirculante} bold negative />
                        <BalanceRow label="Contas a Pagar (até 12m)" value={balance.contasPagar} indent={1} />
                        {balance.passivoCirculanteManual !== 0 && (
                          <BalanceRow label="Lançamentos Manuais" value={balance.passivoCirculanteManual} indent={1} muted />
                        )}
                        <BalanceRow label="Passivo Não Circulante" value={balance.passivoNaoCirculante} bold negative />
                        {balance.passivoNaoCirculanteManual !== 0 && (
                          <BalanceRow label="Lançamentos Manuais" value={balance.passivoNaoCirculanteManual} indent={1} muted />
                        )}
                        <BalanceRow label="TOTAL PASSIVO" value={balance.passivoTotal} bold />
                        <BalanceRow label="Patrimônio Líquido" value={balance.patrimonioLiquido} bold positive={balance.patrimonioLiquido >= 0} negative={balance.patrimonioLiquido < 0} />
                        <BalanceRow label="Resultado Acumulado" value={balance.resultadoAcumulado} indent={1} />
                        {balance.patrimonioLiquidoManual !== 0 && (
                          <BalanceRow label="Capital Social / Ajustes Manuais" value={balance.patrimonioLiquidoManual} indent={1} muted />
                        )}
                        <BalanceRow label="TOTAL PASSIVO + PL" value={balance.passivoMaisPL} bold highlight />
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Quando usar lançamentos manuais</p>
                      <p className="text-muted-foreground mt-1">
                        Registre aqui Capital Social integralizado, reservas de lucro, distribuição de lucros (valor negativo),
                        ajustes contábeis trazidos do seu contador, ou itens patrimoniais não capturados pelos módulos automáticos.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {data.manualEntries.length} lançamento(s) cadastrado(s)
                </p>
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lançamento
                </Button>
              </div>

              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.manualEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum lançamento manual. Clique em "Novo Lançamento" para começar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.manualEntries.map((entry) => (
                          <TableRow key={entry.id} className="border-border">
                            <TableCell>{new Date(entry.reference_date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs border ${ENTRY_TYPE_COLORS[entry.entry_type] || ""}`}>
                                {ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {entry.account_name}
                              {entry.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {entry.account_code || "—"}
                            </TableCell>
                            <TableCell className={`text-right tabular-nums font-medium ${Number(entry.amount) < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                              {fmt(Number(entry.amount))}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)} className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(entry)} className="h-8 w-8">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <BalanceSheetEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editEntry}
        onSaved={onSaved}
      />
    </div>
  );
}

interface BalanceRowProps {
  label: string;
  value: number;
  indent?: number;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
  highlight?: boolean;
}

function BalanceRow({ label, value, indent = 0, bold, positive, negative, muted, highlight }: BalanceRowProps) {
  const labelClass = [
    bold ? "font-semibold" : "",
    muted ? "text-muted-foreground" : "",
    indent > 0 ? "pl-8" : "",
    highlight ? "text-base" : "",
  ].filter(Boolean).join(" ");
  const valueClass = [
    "text-right tabular-nums",
    bold ? "font-semibold" : "",
    positive ? "text-green-600 dark:text-green-400" : "",
    negative ? "text-red-600 dark:text-red-400" : "",
    muted ? "text-muted-foreground" : "",
    highlight ? "text-base" : "",
  ].filter(Boolean).join(" ");
  return (
    <TableRow className={`border-border ${highlight ? "bg-muted/40" : ""}`}>
      <TableCell className={labelClass}>{label}</TableCell>
      <TableCell className={valueClass}>{fmt(value)}</TableCell>
    </TableRow>
  );
}
