import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentationCard } from "@/components/documentation/DocumentationCard";
import { DocumentationSearch } from "@/components/documentation/DocumentationSearch";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export default function Documentation() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("all");
  const [category, setCategory] = useState("all");

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documentation", search, niche, category],
    queryFn: async () => {
      let q = supabase.from("documentation").select("*").eq("is_published", true).order("order_index").order("created_at", { ascending: false });

      if (niche !== "all") q = q.eq("niche", niche);
      if (category !== "all") q = q.eq("category", category);
      if (search.trim()) {
        q = q.textSearch("search_vector", search.trim(), { type: "websearch", config: "portuguese" });
      }

      const { data } = await q;
      return data || [];
    },
  });

  // Get views/feedback aggregates
  const { data: viewsMap = {} } = useQuery({
    queryKey: ["doc-views-agg"],
    queryFn: async () => {
      const { data } = await supabase.from("documentation_views").select("documentation_id, view_count, helpful_yes, helpful_no");
      const map: Record<string, { views: number; yesCount: number; noCount: number }> = {};
      for (const v of data || []) {
        const id = v.documentation_id;
        if (!map[id]) map[id] = { views: 0, yesCount: 0, noCount: 0 };
        map[id].views += v.view_count;
        map[id].yesCount += v.helpful_yes;
        map[id].noCount += v.helpful_no;
      }
      return map;
    },
  });

  const niches = useMemo(() => [...new Set(docs.map((d: any) => d.niche))], [docs]);
  const categories = useMemo(() => [...new Set(docs.map((d: any) => d.category))], [docs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentação</h1>
          <p className="text-muted-foreground">Base de conhecimento e tutoriais</p>
        </div>
        {isAdmin && (
          <Link to="/documentation/admin">
            <Button><Plus className="h-4 w-4 mr-2" />Novo Artigo</Button>
          </Link>
        )}
      </div>

      <DocumentationSearch
        search={search}
        onSearchChange={setSearch}
        niche={niche}
        onNicheChange={setNiche}
        category={category}
        onCategoryChange={setCategory}
        niches={niches}
        categories={categories}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum artigo encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc: any) => {
            const agg = viewsMap[doc.id];
            const total = agg ? agg.yesCount + agg.noCount : 0;
            return (
              <DocumentationCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                description={doc.description}
                niche={doc.niche}
                category={doc.category}
                slug={doc.slug}
                is_featured={doc.is_featured}
                viewCount={agg?.views || 0}
                helpfulPercent={total > 0 ? Math.round((agg!.yesCount / total) * 100) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
