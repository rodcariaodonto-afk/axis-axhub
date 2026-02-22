import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_TAGS = [
  { name: "COMERCIAL", color: "#3B82F6" },
  { name: "AFILIADO", color: "#8B5CF6" },
  { name: "CLIENTE", color: "#10B981" },
  { name: "VIP", color: "#F59E0B" },
  { name: "BLOQUEADO", color: "#EF4444" },
  { name: "SUPORTE", color: "#06B6D4" },
  { name: "LEAD", color: "#EC4899" },
];

const TAG_COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#6366F1", "#84CC16",
];

interface Tag {
  id: string;
  tag_name: string;
  tag_color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  tenantId: string;
  tags: Tag[];
  onTagsChanged: () => void;
}

export function WhatsAppTagManager({ open, onOpenChange, contactId, tenantId, tags, onTagsChanged }: Props) {
  const [newTag, setNewTag] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const { toast } = useToast();

  const addTag = async (name: string, color: string) => {
    if (tags.some((t) => t.tag_name === name)) return;
    const { error } = await supabase.from("whatsapp_contact_tags").insert({
      tenant_id: tenantId,
      contact_id: contactId,
      tag_name: name,
      tag_color: color,
    });
    if (error) {
      toast({ title: "Erro ao adicionar tag", variant: "destructive" });
    } else {
      onTagsChanged();
    }
  };

  const removeTag = async (tagId: string) => {
    await supabase.from("whatsapp_contact_tags").delete().eq("id", tagId);
    onTagsChanged();
  };

  const handleAddCustom = () => {
    if (!newTag.trim()) return;
    addTag(newTag.trim().toUpperCase(), selectedColor);
    setNewTag("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tags atuais</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge
                    key={t.id}
                    className="text-[10px] text-white cursor-pointer gap-1"
                    style={{ backgroundColor: t.tag_color }}
                    onClick={() => removeTag(t.id)}
                  >
                    {t.tag_name}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggested tags */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Sugestões</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.filter((s) => !tags.some((t) => t.tag_name === s.name)).map((s) => (
                <Badge
                  key={s.name}
                  variant="outline"
                  className="text-[10px] cursor-pointer hover:opacity-80 gap-1"
                  style={{ borderColor: s.color, color: s.color }}
                  onClick={() => addTag(s.name, s.color)}
                >
                  <Plus className="h-3 w-3" />
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom tag */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tag personalizada</p>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nome da tag..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
              />
              <Button size="sm" onClick={handleAddCustom} disabled={!newTag.trim()}>
                Adicionar
              </Button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${selectedColor === c ? "scale-125 border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
