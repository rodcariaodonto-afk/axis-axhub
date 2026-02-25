import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Plus, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TAG_COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#6366F1", "#84CC16",
  "#14B8A6", "#A855F7", "#F43F5E", "#0EA5E9", "#D946EF",
  "#22C55E", "#E11D48", "#7C3AED", "#2563EB", "#DC2626",
];

interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

interface Props {
  tenantId: string;
  leadId?: string | null;
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export function LeadTagManager({ tenantId, leadId, selectedTagIds, onTagsChange }: Props) {
  const [tagDefs, setTagDefs] = useState<TagDefinition[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTagDefs();
  }, [tenantId]);

  const fetchTagDefs = async () => {
    const { data } = await supabase
      .from("lead_tag_definitions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    setTagDefs((data as TagDefinition[]) || []);
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    const name = newTagName.trim().toUpperCase();
    if (tagDefs.some((t) => t.name === name)) {
      toast({ title: "Tag já existe", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("lead_tag_definitions")
      .insert({ tenant_id: tenantId, name, color: selectedColor })
      .select()
      .single();
    if (error) {
      toast({ title: "Erro ao criar tag", variant: "destructive" });
      return;
    }
    setTagDefs((prev) => [...prev, data as TagDefinition]);
    onTagsChange([...selectedTagIds, (data as TagDefinition).id]);
    setNewTagName("");
    setShowCreate(false);
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const selectedTags = tagDefs.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = tagDefs.filter((t) => !selectedTagIds.includes(t.id));

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" />
        Tags
      </Label>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((t) => (
            <Badge
              key={t.id}
              className="text-[11px] text-white cursor-pointer gap-1 hover:opacity-80"
              style={{ backgroundColor: t.color }}
              onClick={() => toggleTag(t.id)}
            >
              {t.name}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Available tags */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTags.map((t) => (
            <Badge
              key={t.id}
              variant="outline"
              className="text-[11px] cursor-pointer hover:opacity-80 gap-1"
              style={{ borderColor: t.color, color: t.color }}
              onClick={() => toggleTag(t.id)}
            >
              <Plus className="h-3 w-3" />
              {t.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Create new tag */}
      {!showCreate ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Criar nova tag
        </Button>
      ) : (
        <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nome da tag..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createTag())}
            />
            <Button type="button" size="sm" onClick={createTag} disabled={!newTagName.trim()}>
              Criar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  selectedColor === c ? "scale-125 border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
