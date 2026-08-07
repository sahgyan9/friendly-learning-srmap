import { Link } from "react-router-dom";
import { Trophy, Code2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HackathonLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/hackathon-partners` link with a rich preview card for hackathon team matching.
 */
export function HackathonLinkPreview({ label }: HackathonLinkPreviewProps) {
  return (
    <div
      className="my-3 block w-full overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-3.5 shadow-sm transition-all duration-300 hover:border-amber-500/50 hover:shadow-md dark:from-amber-950/40 dark:via-orange-950/20 dark:border-amber-500/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info Section */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative h-11 w-11 shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
            <Trophy className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Hackathon Teammates & Partners
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium shrink-0"
              >
                <Code2 className="w-2.5 h-2.5 mr-1 inline text-amber-500" />
                Team Building
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              Build your hackathon team! Find developers, UI/UX designers, and business strategists for competitions.
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-500/15">
          <Link
            to="/hackathon-partners"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 rounded-lg shadow-sm transition-transform active:scale-95 w-full sm:w-auto"
          >
            <span>Find Teammates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HackathonLinkPreview;
