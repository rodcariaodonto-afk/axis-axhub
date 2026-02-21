import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2 } from "lucide-react";

export default function BankAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", bank_code: "", account_number: "", balance: "" });
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase.from("bank_accounts").select("*").order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { error } = await supabase.from("bank_accounts").insert({
      tenant_id: profile.tenant_id, name: form.name, bank_code: form.bank_code || null, account_number: form.account_number || null, balance: parseFloat(form.balance) || 0,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Conta criada!" }); setDialogOpen(false); setForm({ name: "", bank_code: "", account_number: "", balance: "" }); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas e saldos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Conta</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Código do Banco</Label><Input value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nº Conta</Label><Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Saldo Inicial</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
              <Button type="submit" className="w-full">Criar Conta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : accounts.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Nenhuma conta bancária cadastrada</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{a.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">R$ {Number(a.balance).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.bank_code && `Banco: ${a.bank_code}`} {a.account_number && `| Conta: ${a.account_number}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
