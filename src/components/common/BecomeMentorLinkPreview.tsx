import { Link } from "react-router-dom";
import { Award, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BecomeMentorLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/become-mentor` link with a rich, attractive call-to-action
 * preview card prompting students to register as a mentor.
 */
export function BecomeMentorLinkPreview({ label }: BecomeMentorLinkPreviewProps) {
  return (
    <div
      className="my-3 block w-full overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent p-3.5 shadow-sm transition-all duration-300 hover:border-blue-500/50 hover:shadow-md dark:from-blue-950/40 dark:via-indigo-950/20 dark:border-blue-500/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info Section */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative h-11 w-11 shrink-0 rounded-xl border border-blue-500/30 bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
            <Award className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Become a Mentor on Friendly Learning
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium shrink-0"
              >
                <Sparkles className="w-2.5 h-2.5 mr-1 inline text-blue-500" />
                Verified Certificate
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              Guide freshers, share your course knowledge, and earn your official Certificate of Mentorship.
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-blue-500/15">
          <Link
            to="/become-mentor"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg shadow-sm transition-transform active:scale-95 w-full sm:w-auto"
          >
            <span>Become a Mentor</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BecomeMentorLinkPreview;
