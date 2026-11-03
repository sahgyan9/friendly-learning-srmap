import { useState } from "react";
import {
  Star,
  Mail,
  Copy,
  Check,
  UserRound,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/faculty/StarRating";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";
import { Faculty, getFacultyEmail, getFacultyProfileUrl } from "@/integrations/supabase/services/faculty";
import { toast } from "sonner";

interface FacultyHeroHeaderProps {
  faculty: Faculty;
  ownReview: boolean;
  onRateClick: () => void;
}

export default function FacultyHeroHeader({
  faculty,
  ownReview,
  onRateClick,
}: FacultyHeroHeaderProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const email = getFacultyEmail(faculty);
  const officialProfileUrl = getFacultyProfileUrl(faculty);
  const hasRatings = faculty.rating_count > 0;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success(`Copied ${email}`);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6 animate-fade-up">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary md:h-28 md:w-28">
            {faculty.image_url ? (
              <img
                src={getOptimizedImageUrl(faculty.image_url, { width: 300, quality: 80 })}
                alt={faculty.name}
                className="h-full w-full object-cover object-top"
                loading="eager"
                decoding="async"
              />
            ) : (
              <UserRound className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {faculty.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                {[faculty.designation, faculty.department, faculty.school].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {email && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-foreground underline-offset-4 hover:text-primary hover:underline"
                    title="Compose in Gmail"
                  >
                    {email}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleCopyEmail}
                    aria-label={copiedEmail ? "Email copied" : "Copy email address"}
                  >
                    {copiedEmail ? <Check className="text-emerald-600 dark:text-emerald-400" /> : <Copy />}
                  </Button>
                </span>
              )}

              {faculty.office_location && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {faculty.office_location}
                </span>
              )}

              {officialProfileUrl && (
                <a
                  href={officialProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Official profile
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-4 md:items-end md:border-l md:border-t-0 md:pl-6 md:pt-0">
          {hasRatings ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold tracking-tight text-foreground tabular">
                {Number(faculty.avg_overall).toFixed(1)}
              </span>
              <div>
                <StarRating value={Number(faculty.avg_overall)} />
                <p className="mt-0.5 text-xs text-muted-foreground tabular">
                  {faculty.rating_count} anonymous {faculty.rating_count === 1 ? "rating" : "ratings"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ratings yet</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={onRateClick} size="sm">
              <Star />
              {ownReview ? "Edit your rating" : "Rate"}
            </Button>

            {email && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`Academic Guidance / Inquiry - ${faculty.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Compose in Gmail"
                >
                  <Mail />
                  Email
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
