import { useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FeedbackSection } from "./FeedbackSection";

interface Doc {
  id: string;
  title: string;
  description: string | null;
  niche: string;
  category: string;
  subcategory: string | null;
  content: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[];
}

interface DocumentationViewerProps {
  doc: Doc;
}

export function DocumentationViewer({ doc }: DocumentationViewerProps) {
  const { user } = useAuth();
  const startTime = useRef(Date.now());

  // Track view and time spent
  useEffect(() => {
    if (!user) return;
    startTime.current = Date.now();

    // Register view
    const trackView = async () => {
      const { data: existing } = await supabase
        .from("documentation_views")
        .select("*")
        .eq("documentation_id", doc.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("documentation_views").update({
          view_count: existing.view_count + 1,
          last_viewed_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("documentation_views").insert({
          documentation_id: doc.id,
          user_id: user.id,
          tenant_id: doc.tenant_id,
        });
      }
    };
    trackView();

    return () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      if (seconds > 2) {
        // Fire and forget time tracking
        supabase
          .from("documentation_views")
          .select("id, time_spent_seconds")
          .eq("documentation_id", doc.id)
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              supabase.from("documentation_views").update({
                time_spent_seconds: data.time_spent_seconds + seconds,
              }).eq("id", data.id).then(() => {});
            }
          });
      }
    };
  }, [doc.id, user]);

  // Generate TOC from content
  const toc = useMemo(() => {
    const headings: { level: number; text: string; id: string }[] = [];
    const lines = doc.content.split("\n");
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (match) {
        const text = match[2].trim();
        headings.push({
          level: match[1].length,
          text,
          id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        });
      }
    }
    return headings;
  }, [doc.content]);

  return (
    <div className="flex gap-8">
      {/* TOC sidebar */}
      {toc.length > 2 && (
        <nav className="hidden lg:block w-56 shrink-0 sticky top-4 self-start">
          <p className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider">NESTE ARTIGO</p>
          <ul className="space-y-1">
            {toc.map((h) => (
              <li key={h.id} style={{ paddingLeft: (h.level - 1) * 12 }}>
                <a
                  href={`#${h.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors block py-0.5"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Content */}
      <article className="flex-1 min-w-0">
        <div className="mb-6">
          <div className="flex gap-2 mb-2 flex-wrap">
            <Badge variant="outline">{doc.niche}</Badge>
            <Badge variant="outline">{doc.category}</Badge>
            {doc.subcategory && <Badge variant="outline">{doc.subcategory}</Badge>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{doc.title}</h1>
          {doc.description && <p className="text-lg text-muted-foreground">{doc.description}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            v{doc.version} · Atualizado em {new Date(doc.updated_at).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return <h1 id={id}>{children}</h1>;
              },
              h2: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return <h2 id={id}>{children}</h2>;
              },
              h3: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return <h3 id={id}>{children}</h3>;
              },
            }}
          >
            {doc.content}
          </ReactMarkdown>
        </div>

        <FeedbackSection documentationId={doc.id} tenantId={doc.tenant_id} />
      </article>
    </div>
  );
}
