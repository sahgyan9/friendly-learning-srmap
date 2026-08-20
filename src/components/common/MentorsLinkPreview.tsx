import { Link } from "react-router-dom";
import { Users, UserCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MentorsLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/mentors` link with a rich preview card for senior student mentors.
 */
export function MentorsLinkPreview({ label }: MentorsLinkPreviewProps) {
  return (
    <div
      className="my-3 block w-full overflow-hidden rounded-xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent p-3.5 shadow-sm transition-all duration-300 hover:border-teal-500/50 hover:shadow-md dark:from-teal-950/40 dark:via-emerald-950/20 dark:border-teal-500/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info Section */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative h-11 w-11 shrink-0 rounded-xl border border-teal-500/30 bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner">
            <Users className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Senior Student Mentors
              </span>
              <Badge
                variant="outline"
                className="text-3xs px-1.5 py-0 h-4 border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-medium shrink-0"
              >
                <UserCheck className="w-2.5 h-2.5 mr-1 inline text-teal-500" />
                Verified Mentors
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              Connect with experienced senior students in your department for guidance, study advice, and subject help.
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-teal-500/15">
          <Link
            to="/mentors"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg shadow-sm transition-transform active:scale-95 w-full sm:w-auto"
          >
            <span>Find a Mentor</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MentorsLinkPreview;
