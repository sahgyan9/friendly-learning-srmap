import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  getDocumentSections,
  type CampusDocumentSection,
} from "@/integrations/supabase/services/documents";

/**
 * Public reader for a campus_documents entry — the page AI Overview and
 * search citations link to for entity_type "document". One document_slug
 * spans many rows (one per section/page), all sharing this route, so this
 * renders every published section for the slug in reading order rather than
 * a single row.
 */
const DocumentDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [sections, setSections] = useState<CampusDocumentSection[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getDocumentSections(slug).then(({ data }) => {
      setSections(data);
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

  if (!sections || sections.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-28 flex-1 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Document not found</h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            This document may have been removed, unpublished, or the link may be invalid.
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

  const { document_title, category, academic_year, source_filename } = sections[0];
  const shareUrl = `${PRIMARY_DOMAIN}/documents/${slug}`;
  const categoryLabel = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const firstSection = sections.find((s) => s.content)?.content ?? "";

  return (
    <>
      <SEOHead
        title={`${document_title} | SRM University-AP`}
        description={firstSection.slice(0, 155).trim() || `${document_title} — official document for SRM University-AP students.`}
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
              {academic_year && (
                <Badge variant="secondary" className="font-mono text-xs">
                  AY {academic_year}
                </Badge>
              )}
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground">
              {document_title}
            </h1>

            {source_filename && (
              <p className="mt-2 text-xs text-muted-foreground border-b border-border pb-4">
                Source: {source_filename}
              </p>
            )}

            <div className="mt-6 space-y-8">
              {sections.map((section) => (
                <div key={section.id}>
                  <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    {section.section_heading}
                    {section.page_number != null && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Page {section.page_number}
                      </span>
                    )}
                  </h2>
                  <div className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-foreground/90 font-normal">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-end border-t border-border pt-4">
              <Button asChild size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                <Link to={`/search?q=${encodeURIComponent(`What does "${document_title}" say?`)}`}>
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

export default DocumentDetail;
