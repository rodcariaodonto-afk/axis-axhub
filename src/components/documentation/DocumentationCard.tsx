import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";

interface DocumentationCardProps {
  id: string;
  title: string;
  description: string | null;
  niche: string;
  category: string;
  slug: string;
  is_featured: boolean;
  viewCount?: number;
  helpfulPercent?: number;
}

export function DocumentationCard({
  title, description, niche, category, slug, is_featured, viewCount = 0, helpfulPercent,
}: DocumentationCardProps) {
  return (
    <Link to={`/documentation/${slug}`} className="block group">
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </CardTitle>
            {is_featured && <Badge variant="secondary" className="shrink-0">Destaque</Badge>}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs">{niche}</Badge>
            <Badge variant="outline" className="text-xs">{category}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{viewCount}</span>
            {helpfulPercent !== undefined && (
              <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{helpfulPercent}%</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
