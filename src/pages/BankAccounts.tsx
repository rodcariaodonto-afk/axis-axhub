import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, ArrowLeft, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) return;
      const { error } = await supabase.from("bank_accounts").insert({
        tenant_id: profile.tenant_id, name: form.name, bank_code: form.bank_code || null, account_number: form.account_number || null, balance: parseFloat(form.balance) || 0,
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

  if (selectedAccount) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAccount(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedAccount.name}</h1>
            <p className="text-muted-foreground">
              Saldo: <span className="font-semibold text-foreground">R$ {Number(selectedAccount.balance).toFixed(2)}</span>
              {selectedAccount.bank_code && ` | Banco: ${selectedAccount.bank_code}`}
              {selectedAccount.account_number && ` | Conta: ${selectedAccount.account_number}`}
            </p>
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
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
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
