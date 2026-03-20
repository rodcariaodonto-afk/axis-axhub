import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, ArrowLeft, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight } from "lucide-react";
import { getUserTenantId } from "@/lib/getUserTenantId";

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [form, setForm] = useState({ name: "", bank_code: "", account_number: "", balance: "" });
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const { toast } = useToast();

  // Transfer state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    from_account_id: "",
    to_account_id: "",
    amount: "",
    transfer_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase.from("bank_accounts").select("*").order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditAccount(null);
    setForm({ name: "", bank_code: "", account_number: "", balance: "" });
    setDialogOpen(true);
  };

  const openEdit = (account: any) => {
    setEditAccount(account);
    setForm({ name: account.name, bank_code: account.bank_code || "", account_number: account.account_number || "", balance: String(account.balance) });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editAccount) {
      const { error } = await supabase.from("bank_accounts").update({
        name: form.name, bank_code: form.bank_code || null, account_number: form.account_number || null,
      }).eq("id", editAccount.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Conta atualizada!" }); setDialogOpen(false); setEditAccount(null); fetchData(); }
    } else {
      const tenantId = await getUserTenantId();
      if (!tenantId) return;
      const { error } = await supabase.from("bank_accounts").insert({
        tenant_id: tenantId, name: form.name, bank_code: form.bank_code || null, account_number: form.account_number || null, balance: parseFloat(form.balance) || 0,
      });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Conta criada!" }); setDialogOpen(false); setForm({ name: "", bank_code: "", account_number: "", balance: "" }); fetchData(); }
    }
  };

  const handleDelete = async (account: any) => {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", account.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Conta excluída!" }); if (selectedAccount?.id === account.id) setSelectedAccount(null); fetchData(); }
  };

  const viewTransactions = async (account: any) => {
    setSelectedAccount(account);
    setTxLoading(true);
    const { data } = await supabase.from("bank_transactions").select("*").eq("account_id", account.id).order("transaction_date", { ascending: false }).limit(50);
    setTransactions(data || []);
    setTxLoading(false);
  };

  const openTransfer = (fromAccountId?: string) => {
    setTransferForm({
      from_account_id: fromAccountId || "",
      to_account_id: "",
      amount: "",
      transfer_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setTransferOpen(true);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Erro", description: "Informe um valor válido", variant: "destructive" });
      return;
    }
    if (transferForm.from_account_id === transferForm.to_account_id) {
      toast({ title: "Erro", description: "Selecione contas diferentes", variant: "destructive" });
      return;
    }

    const fromAccount = accounts.find(a => a.id === transferForm.from_account_id);
    const toAccount = accounts.find(a => a.id === transferForm.to_account_id);
    if (!fromAccount || !toAccount) return;

    if (Number(fromAccount.balance) < amount) {
      toast({ title: "Erro", description: "Saldo insuficiente na conta de origem", variant: "destructive" });
      return;
    }

    setTransferLoading(true);
    try {
      const tenantId = await getUserTenantId();
      if (!tenantId) throw new Error("Tenant não encontrado");

      const descFrom = `Transferência para ${toAccount.name}`;
      const descTo = `Transferência de ${fromAccount.name}`;
      const notes = transferForm.notes ? ` - ${transferForm.notes}` : "";

      // 1. Insert transfer log
      const { error: e1 } = await supabase.from("bank_transfers").insert({
        tenant_id: tenantId,
        from_account_id: transferForm.from_account_id,
        to_account_id: transferForm.to_account_id,
        amount,
        transfer_date: transferForm.transfer_date,
        notes: transferForm.notes || null,
      });
      if (e1) throw e1;

      // 2. Debit transaction
      const { error: e2 } = await supabase.from("bank_transactions").insert({
        tenant_id: tenantId,
        account_id: transferForm.from_account_id,
        type: "debit",
        amount,
        description: descFrom + notes,
        transaction_date: transferForm.transfer_date,
      });
      if (e2) throw e2;

      // 3. Credit transaction
      const { error: e3 } = await supabase.from("bank_transactions").insert({
        tenant_id: tenantId,
        account_id: transferForm.to_account_id,
        type: "credit",
        amount,
        description: descTo + notes,
        transaction_date: transferForm.transfer_date,
      });
      if (e3) throw e3;

      // 4. Update balances
      const { error: e4 } = await supabase.from("bank_accounts").update({ balance: Number(fromAccount.balance) - amount }).eq("id", fromAccount.id);
      if (e4) throw e4;
      const { error: e5 } = await supabase.from("bank_accounts").update({ balance: Number(toAccount.balance) + amount }).eq("id", toAccount.id);
      if (e5) throw e5;

      toast({ title: "Transferência realizada com sucesso!" });
      setTransferOpen(false);
      fetchData();
      // Refresh extrato if viewing one of the accounts
      if (selectedAccount?.id === fromAccount.id) viewTransactions(fromAccount);
      else if (selectedAccount?.id === toAccount.id) viewTransactions(toAccount);
    } catch (err: any) {
      toast({ title: "Erro na transferência", description: err.message, variant: "destructive" });
    } finally {
      setTransferLoading(false);
    }
  };

  // Transfer Modal
  const TransferModal = () => (
    <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="space-y-2">
            <Label>Conta de Origem</Label>
            <Select value={transferForm.from_account_id} onValueChange={(v) => setTransferForm({ ...transferForm, from_account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta de origem" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} — R$ {Number(a.balance).toFixed(2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conta de Destino</Label>
            <Select value={transferForm.to_account_id} onValueChange={(v) => setTransferForm({ ...transferForm, to_account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta de destino" /></SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.id !== transferForm.from_account_id).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} — R$ {Number(a.balance).toFixed(2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={transferForm.transfer_date} onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motivo / Observações</Label>
            <Textarea value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} placeholder="Descreva o motivo da transferência..." rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={transferLoading || !transferForm.from_account_id || !transferForm.to_account_id}>
            {transferLoading ? "Processando..." : "Confirmar Transferência"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (selectedAccount) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAccount(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{selectedAccount.name}</h1>
            <p className="text-muted-foreground">
              {selectedAccount.bank_code && `Banco: ${selectedAccount.bank_code}`}
              {selectedAccount.account_number && ` | Conta: ${selectedAccount.account_number}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="text-2xl font-bold">R$ {Number(selectedAccount.balance).toFixed(2)}</p>
            </div>
            <Button variant="outline" onClick={() => openTransfer(selectedAccount.id)}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />Transferir
            </Button>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Extrato de Transações</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Reconciliado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
                transactions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada</TableCell></TableRow> :
                transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell>{new Date(tx.transaction_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {tx.type === "credit" ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                        <span className={tx.type === "credit" ? "text-emerald-500" : "text-destructive"}>
                          {tx.type === "credit" ? "Crédito" : "Débito"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === "credit" ? "text-emerald-500" : "text-destructive"}`}>
                      {tx.type === "credit" ? "+" : "-"} R$ {Number(tx.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.reconciled ? "default" : "secondary"}>{tx.reconciled ? "Sim" : "Não"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TransferModal />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas e saldos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openTransfer()}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />Transferência
          </Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditAccount(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editAccount ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Código do Banco</Label><Input value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nº Conta</Label><Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
            </div>
            {!editAccount && (
              <div className="space-y-2"><Label>Saldo Inicial</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
            )}
            <Button type="submit" className="w-full">{editAccount ? "Salvar" : "Criar Conta"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <TransferModal />

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : accounts.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Nenhuma conta bancária cadastrada</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id} className="border-border bg-card cursor-pointer hover:border-primary/50 transition-colors" onClick={() => viewTransactions(a)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{a.name}</CardTitle>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(a)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">R$ {Number(a.balance).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.bank_code && `Banco: ${a.bank_code}`} {a.account_number && `| Conta: ${a.account_number}`}
                </p>
                <p className="text-xs text-primary mt-2">Clique para ver extrato →</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
