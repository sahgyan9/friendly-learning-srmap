import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight, Newspaper, Megaphone, BookOpen, CalendarDays } from "lucide-react";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";

export interface PostCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  author: string;
  image?: string;
  onView?: () => void;
}

/** Per-category colour + icon — mirrors the Events brand accent (violet). */
const CATEGORY_META: Record<string, {
  gradient: "sky" | "violet" | "amber" | "emerald";
  badge: string;
  icon: React.ElementType;
  label: string;
}> = {
  news:    { gradient: "sky",     badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",     icon: Newspaper,    label: "News" },
  events:  { gradient: "violet",  badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",  icon: CalendarDays, label: "Event" },
  ads:     { gradient: "amber",   badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",   icon: Megaphone,    label: "Ad" },
  courses: { gradient: "emerald", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: BookOpen,     label: "Course" },
};
const DEFAULT_META = { gradient: "violet" as const, badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20", icon: CalendarDays, label: "Post" };

export function PostCard({
  title,
  description,
  category,
  date,
  author,
  image,
  onView,
}: PostCardProps) {
  const meta = CATEGORY_META[category?.toLowerCase()] ?? DEFAULT_META;
  const Icon = meta.icon;

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-violet-500/30",
      )}
    >
      {/* Solid full-width top accent border */}
      <CardAccentBorder gradient={meta.gradient} />

      {/* Hover glow — Events brand colour (violet) */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-violet-500/5 to-transparent" />

      {/* Image */}
      {image && (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img
            src={getOptimizedImageUrl(image, { width: 640, quality: 75 })}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      {/* Body */}
      <div className="relative flex flex-1 flex-col gap-3 p-4 pt-4">
        {/* Category pill + date */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1.5 text-xs font-semibold", meta.badge)}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {date}
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors duration-200 group-hover:text-violet-600 dark:group-hover:text-violet-400">
          {title}
        </h3>

        {/* Description */}
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Footer — separated with border-t */}
      <div className="relative flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">{author}</span>
        </div>

        <Button
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-3 text-xs font-semibold transition-all duration-200",
            "bg-violet-500 hover:bg-violet-600 text-white border-transparent",
            "group-hover:gap-2",
          )}
          onClick={onView}
        >
          View
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </div>
    </Card>
  );
}