import { Link } from "react-router-dom";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PostEmbedLinkPreviewProps {
  url: string;
}

/**
 * Replaces a pasted `/community-posts` link with a rich preview card for post discussions.
 */
export function PostEmbedLinkPreview({ url }: PostEmbedLinkPreviewProps) {
  // Check if there is a hash or query pointing to a specific post
  let destination = "/community-posts";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    destination = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    destination = "/community-posts";
  }

  return (
    <div
      className="my-3 block w-full overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-3.5 shadow-sm transition-all duration-300 hover:border-indigo-500/50 hover:shadow-md dark:from-indigo-950/40 dark:via-purple-950/20 dark:border-indigo-500/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info Section */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative h-11 w-11 shrink-0 rounded-xl border border-indigo-500/30 bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
            <MessageSquare className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Community Discussion Post
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium shrink-0"
              >
                Community Board
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              Shared post from the Friendly Learning student discussion board.
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex items-center justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-indigo-500/15">
          <Link
            to={destination}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-sm transition-transform active:scale-95 w-full sm:w-auto"
          >
            <span>View Discussion</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PostEmbedLinkPreview;
