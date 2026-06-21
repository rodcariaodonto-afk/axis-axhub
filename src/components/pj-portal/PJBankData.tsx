import { Building2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePJBankAccounts, PIX_KEY_TYPE_LABELS, ACCOUNT_TYPE_LABELS, type AccountType, type PixKeyType } from "@/hooks/usePJBankData";
import { usePJSession } from "./PJPortalLayout";

export default function PJBankData() {
  const { pjId } = usePJSession();
  const { data: accounts = [], isLoading } = usePJBankAccounts(pjId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dados Bancários</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contas bancárias e chaves PIX cadastradas para recebimento de repasses.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Carregando...
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground rounded-lg border border-dashed border-border">
          <Building2 className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhuma conta bancária cadastrada.</p>
          <p className="text-xs text-center max-w-xs">
            Entre em contato com a clínica para cadastrar seus dados bancários e receber repasses via PIX.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-lg border border-border bg-card p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{acc.name}</p>
                    {acc.bank_code && (
                      <p className="text-xs text-muted-foreground font-mono">{acc.bank_code}</p>
                    )}
                  </div>
                </div>
                {acc.account_type && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {ACCOUNT_TYPE_LABELS[acc.account_type as AccountType] ?? acc.account_type}
                  </Badge>
                )}
              </div>

              {/* Dados da conta */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {acc.agency && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Agência</span>
                    <span className="font-mono">{acc.agency}</span>
                  </div>
                )}
                {acc.account_number && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Conta</span>
                    <span className="font-mono">{acc.account_number}</span>
                  </div>
                )}
                {acc.cnpj_titular && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">CNPJ / CPF Titular</span>
                    <span className="font-mono">{acc.cnpj_titular}</span>
                  </div>
                )}
              </div>

              {/* PIX */}
              {acc.pix_key && (
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Chave PIX</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {acc.pix_key_type && (
                      <Badge variant="secondary" className="text-xs">
                        {PIX_KEY_TYPE_LABELS[acc.pix_key_type as PixKeyType] ?? acc.pix_key_type}
                      </Badge>
                    )}
                    <span className="font-mono text-sm break-all">{acc.pix_key}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
