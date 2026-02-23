import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload } from "lucide-react";

interface CampaignContactListProps {
  campaignId: string;
}

export function CampaignContactList({ campaignId }: CampaignContactListProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState({ telefone: "", nome: "" });
  const [bulkText, setBulkText] = useState("");
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("campanhas_contatos").select("*").eq("campanha_id", campaignId).order("created_at", { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const { error } = await supabase.from("campanhas_contatos").insert({ tenant_id: profile.tenant_id, campanha_id: campaignId, telefone: form.telefone, nome: form.nome || null });
    if (error) { toast({ title: "Erro ao adicionar contato", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contato adicionado!" }); setAddOpen(false); setForm({ telefone: "", nome: "" }); fetch();
  };

  const bulkAdd = async () => {
    const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
    if (!profile) return;
    const lines = bulkText.split("\n").filter(Boolean);
    const rows = lines.map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      return { tenant_id: profile.tenant_id, campanha_id: campaignId, telefone: parts[0], nome: parts[1] || null };
    }).filter((r) => r.telefone);
    if (rows.length === 0) return;
    const { error } = await supabase.from("campanhas_contatos").insert(rows);
    if (error) { toast({ title: "Erro ao importar contatos", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${rows.length} contatos importados!` }); setBulkOpen(false); setBulkText(""); fetch();
  };

  const removeContact = async (id: string) => {
    await supabase.from("campanhas_contatos").delete().eq("id", id);
    fetch();
  };

  const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pendente: { label: "Pendente", variant: "secondary" },
    enviado: { label: "Enviado", variant: "default" },
    erro: { label: "Erro", variant: "destructive" },
    respondeu: { label: "Respondeu", variant: "outline" },
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-3 w-3" />Adicionar</Button>
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><Upload className="mr-1 h-3 w-3" />Importar em Massa</Button>
        <span className="text-sm text-muted-foreground self-center ml-auto">{contacts.length} contatos</span>
      </div>

      {contacts.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-8 text-center text-muted-foreground">Nenhum contato adicionado.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.nome || c.telefone}</p>
                <p className="text-xs text-muted-foreground">{c.telefone}</p>
              </div>
              <Badge variant={statusBadge[c.status]?.variant || "secondary"}>{statusBadge[c.status]?.label || c.status}</Badge>
              {c.erro_mensagem && <span className="text-xs text-destructive max-w-32 truncate">{c.erro_mensagem}</span>}
              <Button variant="ghost" size="icon" onClick={() => removeContact(c.id)} className="h-8 w-8"><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Adicionar Contato</DialogTitle></DialogHeader>
          <form onSubmit={addContact} className="space-y-4">
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required placeholder="5511999999999" /></div>
            <div className="space-y-2"><Label>Nome (opcional)</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <Button type="submit" className="w-full">Adicionar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Importar Contatos em Massa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cole os contatos (um por linha)</Label>
              <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={8} placeholder={"5511999999999, João\n5511888888888, Maria\n5511777777777"} />
              <p className="text-xs text-muted-foreground">Formato: telefone, nome (nome é opcional)</p>
            </div>
            <Button onClick={bulkAdd} className="w-full">Importar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
