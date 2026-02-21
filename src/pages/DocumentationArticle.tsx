import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentationViewer } from "@/components/documentation/DocumentationViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DocumentationArticle() {
  const { slug } = useParams<{ slug: string }>();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["documentation-article", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("documentation")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Artigo não encontrado.</p>
        <Link to="/documentation">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/documentation">
        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à documentação</Button>
      </Link>
      <DocumentationViewer doc={doc as any} />
    </div>
  );
}
