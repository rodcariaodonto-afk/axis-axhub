import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import { formatDocument, stripDocument, type DocType } from "@/lib/documentMask";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddressFields from "@/components/address/AddressFields";

const emptyForm = {
  name: "", cnpj: "", email: "", phone: "", phone2: "",
  contact_name: "", state_registration: "", city_registration: "",
  postal_code: "", street: "", city: "", state: "", country: "Brasil",
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [docType, setDocType] = useState<DocType>("cnpj");
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!profile) return;
    const { error } = await supabase.from("suppliers").insert({
      tenant_id: profile.tenant_id,
      name: form.name,
      cnpj: stripDocument(form.cnpj) || null,
      email: form.email || null,
      phone: form.phone || null,
      phone2: form.phone2 || null,
      contact_name: form.contact_name || null,
      state_registration: form.state_registration || null,
      city_registration: form.city_registration || null,
      postal_code: form.postal_code || null,
      street: form.street || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || "Brasil",
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Fornecedor criado!" }); setDialogOpen(false); setForm({ ...emptyForm }); fetchData(); }
  };

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Fornecedor</Button></DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh]">
            <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={handleCreate} className="space-y-4 pb-2">
                <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2">
                  <Label>Documento</Label>
                  <div className="flex gap-2">
                    <Select value={docType} onValueChange={(v) => { setDocType(v as DocType); setForm({ ...form, cnpj: "" }); }}>
                      <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="nif">NIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={form.cnpj}
                      onChange={(e) => setForm({ ...form, cnpj: docType === "nif" ? e.target.value : formatDocument(e.target.value) })}
                      placeholder={docType === "cpf" ? "000.000.000-00" : docType === "cnpj" ? "00.000.000/0000-00" : "Número de Identificação Fiscal"}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Inscrição Estadual</Label><Input value={form.state_registration} onChange={(e) => setForm({ ...form, state_registration: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Inscrição Municipal</Label><Input value={form.city_registration} onChange={(e) => setForm({ ...form, city_registration: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Nome do Contato</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Telefone 1</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Telefone 2</Label><Input value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} /></div>
                <AddressFields
                  postal_code={form.postal_code}
                  country={form.country}
                  street={form.street}
                  city={form.city}
                  state={form.state}
                  onChange={(fields) => setForm((prev) => ({ ...prev, ...fields }))}
                />
                <Button type="submit" className="w-full">Criar Fornecedor</Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Telefone 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum fornecedor encontrado</TableCell></TableRow> :
              filtered.map((s) => (
                <TableRow key={s.id} className="border-border">
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.cnpj ? formatDocument(s.cnpj) : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.contact_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone2 || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
