import { Link } from "react-router-dom";
import { Calendar, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MarketplaceLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/marketplace` link with a rich preview card for campus events and workshops.
 */
export function MarketplaceLinkPreview({ label }: MarketplaceLinkPreviewProps) {
  return (
    <div
      className="my-3 block w-full overflow-hidden rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent p-3.5 shadow-sm transition-all duration-300 hover:border-sky-500/50 hover:shadow-md dark:from-sky-950/40 dark:via-blue-950/20 dark:border-sky-500/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info Section */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative h-11 w-11 shrink-0 rounded-xl border border-sky-500/30 bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-inner">
            <Calendar className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Campus Events & Workshops
              </span>
              <Badge
                variant="outline"
                className="text-3xs px-1.5 py-0 h-4 border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium shrink-0"
              >
                <Sparkles className="w-2.5 h-2.5 mr-1 inline text-sky-500" />
                Workshops & Fests
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              Discover upcoming campus events, club activities, technical workshops, and hackathons at SRM AP.
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-sky-500/15">
          <Link
            to="/events"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg shadow-sm transition-transform active:scale-95 w-full sm:w-auto"
          >
            <span>Explore Events</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceLinkPreview;
