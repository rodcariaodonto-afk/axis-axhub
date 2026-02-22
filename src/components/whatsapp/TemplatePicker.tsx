import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Search } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[] | null;
  type: string;
}

interface Props {
  onSelect: (body: string) => void;
  contactName?: string;
}

export function TemplatePicker({ onSelect, contactName }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("email_templates")
      .select("*")
      .in("type", ["whatsapp", "geral"])
      .order("name")
      .then(({ data }) => setTemplates((data as Template[]) || []));
  }, [open]);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (t: Template) => {
    let body = t.body;
    if (contactName) {
      body = body.replace(/\{\{nome\}\}/gi, contactName);
    }
    onSelect(body);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Inserir template">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Inserir Template</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar template..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <ScrollArea className="max-h-[300px]">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum template encontrado</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className="w-full text-left p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{t.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
