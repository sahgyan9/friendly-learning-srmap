import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  Mail,
  Copy,
  Check,
  Building2,
  GraduationCap,
  UserRound,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/faculty/StarRating";
import { Faculty, getFacultyEmail } from "@/integrations/supabase/services/faculty";
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
  const hasRatings = faculty.rating_count > 0;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success(`Copied ${email} to clipboard!`);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-md"
    >
      {/* Background Ambient Glow Accents */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-rose-500/15 via-primary/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-500/15 via-rose-500/5 to-transparent blur-3xl" />

      <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-start justify-between">
        {/* Left: Avatar & Profile Info */}
        <div className="flex flex-col sm:flex-row gap-5 items-start w-full md:w-auto">
          {/* Avatar / Photo */}
          <div className="relative shrink-0 mx-auto sm:mx-0">
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-2xl overflow-hidden border-2 border-border bg-muted/60 shadow-inner flex items-center justify-center">
              {faculty.image_url ? (
                <img
                  src={faculty.image_url}
                  alt={faculty.name}
                  className="h-full w-full object-cover object-top"
                  loading="eager"
                />
              ) : (
                <UserRound className="h-14 w-14 text-muted-foreground/40" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-background bg-card p-1.5 shadow-xs">
              <GraduationCap className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {faculty.name}
                </h1>
                {faculty.designation && (
                  <Badge variant="secondary" className="font-medium text-xs">
                    {faculty.designation}
                  </Badge>
                )}
              </div>

              {/* Department & School */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground/90">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {faculty.department}
                </span>
                {faculty.school && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>{faculty.school}</span>
                  </>
                )}
              </div>
            </div>

            {/* Official Contact & Email & Office Location Strip */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                title="Compose in Gmail"
              >
                <Mail className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                <span>{email}</span>
              </a>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={handleCopyEmail}
                title="Copy email address"
              >
                {copiedEmail ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>

              {faculty.office_location && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  <span>{faculty.office_location}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Rating Snapshot & Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end justify-between gap-4 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          {/* Rating Card Snapshot */}
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 px-4 text-center md:text-right">
            {hasRatings ? (
              <div className="flex items-center gap-3">
                <div className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                  {Number(faculty.avg_overall).toFixed(1)}
                </div>
                <div className="text-left">
                  <StarRating value={Number(faculty.avg_overall)} />
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    {faculty.rating_count} anonymous {faculty.rating_count === 1 ? "review" : "reviews"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-muted-foreground/60" />
                <span>No ratings yet — be the first</span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full">
            <Button
              onClick={onRateClick}
              size="sm"
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              <Star className="h-4 w-4 fill-current" />
              {ownReview ? "Edit Your Rating" : "Rate Faculty"}
            </Button>

            {email && (
              <Button asChild variant="outline" size="sm" className="gap-1.5 border-border/80 hover:bg-muted font-medium">
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`Academic Guidance / Inquiry - ${faculty.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Compose in Gmail"
                >
                  <Mail className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  Connect
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
