import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Users } from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface ContactPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (phones: string[]) => void;
  alreadySelected?: string[];
}

export function ContactPickerModal({ open, onOpenChange, onConfirm, alreadySelected = [] }: ContactPickerModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone")
      .order("first_name", { ascending: true })
      .limit(500);
    console.log("[ContactPicker] data:", data, "error:", error);
    if (data) {
      const withPhone = data.filter((c: any) => c.phone && c.phone.trim() !== "");
      setContacts(withPhone);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadContacts();
      setSelected(new Set());
      setSearch("");
    }
  }, [open, loadContacts]);

  const filtered = contacts.filter((c) => {
    const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.phone!).filter(Boolean)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selecionar Contatos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone ou email..."
              className="pl-9"
            />
          </div>

          {/* Header com selecionar todos */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {selected.size === filtered.length && filtered.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
            </button>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Badge variant="default" className="text-xs">{selected.size} selecionados</Badge>
              )}
              <span className="text-xs text-muted-foreground">{filtered.length} contatos</span>
            </div>
          </div>

          {/* Lista */}
          <ScrollArea className="h-72 border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum contato com telefone encontrado</p>
            ) : (
              <div className="p-2 space-y-0.5">
                {filtered.map((c) => {
                  const phone = c.phone || "";
                  const isSelected = selected.has(phone);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggle(phone)}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.first_name} {c.last_name || ""}</p>
                        <p className="text-xs text-muted-foreground font-mono">{phone}</p>
                      </div>
                      {c.email && (
                        <p className="text-xs text-muted-foreground truncate max-w-32 hidden sm:block">{c.email}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Adicionar {selected.size > 0 ? `${selected.size} contatos` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
