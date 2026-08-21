import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Check,
  FileText,
  Hash,
  Link2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  getNoticeById,
  type CampusNotice,
} from "@/integrations/supabase/services/notices";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  holiday_change: {
    label: "Holiday Change",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  academic_calendar: {
    label: "Academic Calendar",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  exam: {
    label: "Exam",
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  event: {
    label: "Event",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  administrative: {
    label: "Administrative",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  general: {
    label: "General Notice",
    badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
};

function formatNoticeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.031 21.785h-.005a9.706 9.706 0 0 1-4.949-1.355l-.355-.21-3.68.966.982-3.586-.231-.368a9.716 9.716 0 0 1-1.489-5.185c.003-5.372 4.37-9.741 9.735-9.741 2.6.001 5.045 1.015 6.881 2.854a9.673 9.673 0 0 1 2.848 6.892c-.002 5.371-4.37 9.733-9.737 9.733zm8.318-18.061A11.65 11.65 0 0 0 12.03 0C5.503 0 .19 5.311.187 11.836a11.82 11.82 0 0 0 1.583 5.945L0 24l6.363-1.669a11.849 11.849 0 0 0 5.663 1.443h.005c6.527 0 11.84-5.312 11.843-11.837a11.767 11.767 0 0 0-3.525-8.213z" />
    </svg>
  );
}

const NoticeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();

  const [notice, setNotice] = useState<CampusNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data } = await getNoticeById(id);
    setNotice(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!linkCopied) return;
    const timer = setTimeout(() => setLinkCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [linkCopied]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast.success("Copied", { description: "Link copied to your clipboard." });
    } catch {
      toast.error("Could not copy the link", { description: url });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-24 flex-1">
          <Skeleton className="h-4 w-28 mb-6" />
          <div className="rounded-xl border bg-card p-6 sm:p-8">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="h-8 w-4/5 mb-4" />
            <Skeleton className="h-4 w-2/5 mb-6" />
            <Skeleton className="h-20 w-full mb-6 rounded-lg" />
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

  if (!notice || (!notice.is_published && !isAdmin)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-28 flex-1 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Notice not found</h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            This circular may have been removed, unpublished, or the link may be invalid.
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

  const categoryMeta = CATEGORY_CONFIG[notice.category] ?? {
    label: notice.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    badgeClass: "border-border bg-muted/60 text-foreground",
  };

  const shareUrl = `${PRIMARY_DOMAIN}/notices/${notice.id}`;
  const shareText = [
    notice.title,
    notice.issued_date ? `Issued on ${formatNoticeDate(notice.issued_date)}` : null,
    shareUrl,
  ]
    .filter(Boolean)
    .join(" — ");
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <>
      <SEOHead
        title={`${notice.title} | Campus Notice`}
        description={
          notice.summary ||
          notice.content.slice(0, 155).trim() ||
          `${notice.title} — official circular for SRM University-AP students.`
        }
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
              <Badge variant="outline" className={`font-medium ${categoryMeta.badgeClass}`}>
                {categoryMeta.label}
              </Badge>
              {notice.reference_no && (
                <Badge variant="secondary" className="font-mono text-xs">
                  <Hash className="mr-1 h-3 w-3" />
                  {notice.reference_no}
                </Badge>
              )}
              {!notice.is_published && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                  Unpublished Draft (Admin View)
                </Badge>
              )}
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground">
              {notice.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground border-b border-border pb-4">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground/70" />
                Issued {formatNoticeDate(notice.issued_date)}
              </span>
              {notice.effective_date && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-muted-foreground/70" />
                  Effective {formatNoticeDate(notice.effective_date)}
                </span>
              )}
              {notice.superseded_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground/70" />
                  Rescheduled from {formatNoticeDate(notice.superseded_date)}
                </span>
              )}
            </div>

            {notice.summary && (
              <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary block mb-0.5">
                      Summary
                    </span>
                    <p className="text-foreground/90 leading-relaxed">{notice.summary}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-foreground/90 font-normal">
                {notice.content}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Share:</span>
                <Button asChild size="sm" variant="outline">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
                    <WhatsAppIcon className="mr-1.5 h-4 w-4 text-[#25D366]" />
                    WhatsApp
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyLink(shareUrl)}>
                  {linkCopied ? (
                    <Check className="mr-1.5 h-4 w-4 text-green-600 dark:text-green-500" />
                  ) : (
                    <Link2 className="mr-1.5 h-4 w-4" />
                  )}
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>
              </div>

              <Button asChild size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                <Link to={`/ask?q=${encodeURIComponent(`What does the notice "${notice.title}" say?`)}`}>
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

export default NoticeDetail;
