import { Link } from "react-router-dom";
import { GraduationCap, Star, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FacultyLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/faculty` link with a rich preview card for faculty ratings and reviews.
 */
export function FacultyLinkPreview({ label }: FacultyLinkPreviewProps) {
  return (
    <div
      className="my-3 block w-full overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-3.5 shadow-sm transition-all duration-300 hover:border-purple-500/50 hover:shadow-md dark:from-purple-950/40 dark:via-purple-950/20 dark:border-purple-500/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info Section */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative h-11 w-11 shrink-0 rounded-xl border border-purple-500/30 bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
            <GraduationCap className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Faculty Reviews & Ratings
              </span>
              <Badge
                variant="outline"
                className="text-3xs px-1.5 py-0 h-4 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium shrink-0"
              >
                <Star className="w-2.5 h-2.5 mr-1 inline text-purple-500 fill-purple-500/30" />
                Student Reviews
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              Explore professor ratings, department reviews, and course feedback by SRM AP students.
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-purple-500/15">
          <Link
            to="/faculty"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 rounded-lg shadow-sm transition-transform active:scale-95 w-full sm:w-auto"
          >
            <span>Explore Faculty</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default FacultyLinkPreview;
