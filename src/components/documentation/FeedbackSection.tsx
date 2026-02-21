import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface FeedbackSectionProps {
  documentationId: string;
  tenantId: string;
}

export function FeedbackSection({ documentationId, tenantId }: FeedbackSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["doc-feedback", documentationId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("documentation_feedback")
        .select("*")
        .eq("documentation_id", documentationId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (data) {
        setRating(data.rating);
        setComment(data.comment || "");
      }
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const payload = {
        documentation_id: documentationId,
        user_id: user.id,
        tenant_id: tenantId,
        rating,
        comment: comment || null,
        is_helpful: rating >= 4,
      };
      if (existing) {
        await supabase.from("documentation_feedback").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("documentation_feedback").insert(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-feedback"] });
      toast.success("Avaliação salva!");
    },
  });

  const handleHelpful = async (yes: boolean) => {
    if (!user) return;
    const { data: viewData } = await supabase
      .from("documentation_views")
      .select("*")
      .eq("documentation_id", documentationId)
      .eq("user_id", user.id)
      .maybeSingle();

    const field = yes ? "helpful_yes" : "helpful_no";
    if (viewData) {
      await supabase.from("documentation_views").update({ [field]: (viewData as any)[field] + 1 }).eq("id", viewData.id);
    } else {
      await supabase.from("documentation_views").insert({
        documentation_id: documentationId,
        user_id: user.id,
        tenant_id: tenantId,
        [field]: 1,
      });
    }
    toast.success("Obrigado pelo feedback!");
  };

  return (
    <div className="space-y-6 border-t pt-6 mt-8">
      <div>
        <p className="text-sm font-medium mb-2">Este artigo foi útil?</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleHelpful(true)}>
            <ThumbsUp className="h-4 w-4 mr-1" /> Sim
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleHelpful(false)}>
            <ThumbsDown className="h-4 w-4 mr-1" /> Não
          </Button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Avalie este artigo</p>
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i)}
              className="transition-colors"
            >
              <Star
                className={`h-6 w-6 ${
                  i <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Deixe um comentário (opcional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mb-3"
          rows={3}
        />
        <Button onClick={() => mutation.mutate()} disabled={rating === 0 || mutation.isPending} size="sm">
          {existing ? "Atualizar Avaliação" : "Enviar Avaliação"}
        </Button>
      </div>
    </div>
  );
}
