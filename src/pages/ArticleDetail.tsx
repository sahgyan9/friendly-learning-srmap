import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  getArticleBySlug,
  type KnowledgeArticle,
} from "@/integrations/supabase/services/articles";

/**
 * Public reader for a knowledge_articles entry — the page AI Overview and
 * search citations link to for entity_type "article". content_html is
 * Tiptap output written only by admins (RLS-gated insert/update), so
 * rendering it directly is the same trust boundary as the admin editor
 * itself, not user-supplied HTML.
 */
const ArticleDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getArticleBySlug(slug).then(({ data }) => {
      setArticle(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-24 flex-1">
          <Skeleton className="h-4 w-28 mb-6" />
          <div className="rounded-xl border bg-card p-6 sm:p-8">
            <Skeleton className="h-6 w-32 rounded-full mb-4" />
            <Skeleton className="h-8 w-4/5 mb-6" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-28 flex-1 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Article not found</h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            This article may have been removed, unpublished, or the link may be invalid.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/search">Search Campus</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const shareUrl = `${PRIMARY_DOMAIN}/articles/${article.slug}`;
  const categoryLabel = article.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <SEOHead
        title={`${article.title} | SRM University-AP`}
        description={article.content_text.slice(0, 155).trim() || `${article.title} — campus knowledge for SRM University-AP students.`}
        canonical={shareUrl}
        ogType="article"
      />

      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-24 flex-1">
          <Link
            to="/search"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>

          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-medium border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {categoryLabel}
              </Badge>
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground border-b border-border pb-6">
              {article.title}
            </h1>

            <div
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none mt-6 prose-headings:font-semibold prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: article.content_html }}
            />

            <div className="mt-8 flex items-center justify-end border-t border-border pt-4">
              <Button asChild size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                <Link to={`/search?q=${encodeURIComponent(`Tell me about "${article.title}"`)}`}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Ask AI about this
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default ArticleDetail;
