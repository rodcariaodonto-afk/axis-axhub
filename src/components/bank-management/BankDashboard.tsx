import { Building2, TrendingUp, CheckCircle2, AlertTriangle, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConciliationSummary } from "@/hooks/useConciliation";
import { useAllPJBankAccounts } from "@/hooks/usePJBankData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDate(d: string) {
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
}

function SummaryCard({ label, value, icon: Icon, colorClass }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Repasses recentes por conta ──────────────────────────────────────────────

function RepassesByAccount() {
  const { data: repasses = [], isLoading } = useQuery({
    queryKey: ["repasses-by-account-summary"],
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pj_repasse_history")
        .select("id, pj_id, valor, paid_amount, data_repasse, status, conciliation_status, crm_accounts(name)")
        .order("data_repasse", { ascending: false })
        .limit(10);

      if (error) return [];
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        pj_name: (r.crm_accounts as any)?.name ?? "—",
      }));
    },
  });

  if (isLoading) {
    return <div className="py-4 text-sm text-muted-foreground text-center">Carregando...</div>;
  }

  if (repasses.length === 0) {
    return <div className="py-4 text-sm text-muted-foreground text-center">Nenhum repasse registrado</div>;
  }

  return (
    <div className="divide-y divide-border">
      {repasses.map((r: any) => (
        <div key={r.id} className="flex items-center justify-between py-3 gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{r.pj_name}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(r.data_repasse)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-sm">{fmtCurrency(r.valor)}</span>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                r.conciliation_status === "conciliado"
                  ? "bg-green-500/15 text-green-700 border-green-500/30"
                  : r.conciliation_status === "divergente"
                  ? "bg-red-500/15 text-red-700 border-red-500/30"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              {r.conciliation_status ?? "pendente"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PJs com dados incompletos ────────────────────────────────────────────────

function IncompleteDataWarnings() {
  const { data: accounts = [], isLoading } = useAllPJBankAccounts();

  if (isLoading) return null;

  const incomplete = accounts.filter(
    (a) => !a.pix_key || !a.account_number
  );

  if (incomplete.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 py-2">
        <CheckCircle2 className="h-4 w-4" />
        Todos os PJs têm dados bancários completos.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {incomplete.map((a: any) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
              {a.pj_name ?? a.pj_id.slice(0, 8)}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              {[
                !a.pix_key && "sem chave PIX",
                !a.account_number && "sem número de conta",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BankDashboard() {
  const { data: summary, isLoading: summaryLoading } = useConciliationSummary();

  const cards = [
    {
      label: "Total Pendente",
      value: summaryLoading ? "..." : fmtCurrency(summary?.totalPendente ?? 0),
      icon: Wallet,
      colorClass: "bg-yellow-500/15 text-yellow-600",
    },
    {
      label: "Pago no Mês",
      value: summaryLoading ? "..." : fmtCurrency(summary?.totalPagoMes ?? 0),
      icon: TrendingUp,
      colorClass: "bg-blue-500/15 text-blue-600",
    },
    {
      label: "Total Conciliado",
      value: summaryLoading ? "..." : fmtCurrency(summary?.totalConciliado ?? 0),
      icon: CheckCircle2,
      colorClass: "bg-green-500/15 text-green-600",
    },
    {
      label: "Divergências",
      value: summaryLoading ? "..." : String(summary?.totalDivergente ?? 0),
      icon: AlertTriangle,
      colorClass: "bg-red-500/15 text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <SummaryCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Extrato recente */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Últimos Repasses</h3>
          </div>
          <RepassesByAccount />
        </div>

        {/* PJs com dados incompletos */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Dados Bancários Incompletos</h3>
          </div>
          <IncompleteDataWarnings />
        </div>
      </div>
    </div>
  );
}
