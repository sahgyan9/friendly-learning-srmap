import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ImagePlus, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils/user-utils";
import { CreatePostModal } from "./CreatePostModal";
import { CreateCommunityModal } from "@/components/communities/CreateCommunityModal";

interface PostComposerStripProps {
  onPostCreated: () => void;
}

/**
 * The composer bar that opens the homepage feed.
 *
 * With the headline moved below the feed, this is the first thing on the page,
 * and it does a job no headline could: it shows what the site is *for* by
 * offering the action rather than describing it. The pattern is Facebook's
 * "What's on your mind" strip, and it works because a text field reads as an
 * invitation while a button reads as an ad.
 *
 * Both actions live here on purpose. Posting and starting a group are the two
 * things we want a student to feel they can do without permission, and putting
 * them side by side above the feed makes "make a group" feel as ordinary as
 * "write a post" — which is the whole point, since groups are the thing people
 * assume they need to be someone official to start.
 */
export const PostComposerStrip = ({ onPostCreated }: PostComposerStripProps) => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [showPost, setShowPost] = useState(false);
  const [showGroup, setShowGroup] = useState(false);

  const firstName = profile?.name?.trim().split(/\s+/)[0];

  const actionClass =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium " +
    "text-muted-foreground transition-colors hover:bg-muted";

  // Signed-out visitors get the same shape, but every control says that
  // signing in is what happens next rather than discovering it on the click.
  // `from` is what sends them back here afterwards instead of to the homepage.
  if (!user) {
    return (
      <div className="mx-auto mb-6 max-w-2xl rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
            <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
              ?
            </AvatarFallback>
          </Avatar>
          <Link
            to="/signin"
            state={{ from: location }}
            className="flex-1 truncate rounded-full bg-muted/60 px-4 py-2.5 text-left text-sm
                       text-muted-foreground transition-colors hover:bg-muted"
          >
            Sign in to share something with campus…
          </Link>
        </div>

        <div className="mt-3 flex items-center justify-around gap-2 border-t pt-2">
          <Link to="/signin" state={{ from: location }} className={`${actionClass} flex-1`}>
            <ImagePlus className="h-4 w-4 text-emerald-500" />
            Post
          </Link>
          <Link to="/signin" state={{ from: location }} className={`${actionClass} flex-1`}>
            <Users className="h-4 w-4 text-amber-500" />
            Make Group
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto mb-6 max-w-2xl rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
            <AvatarImage src={profile?.profile_image ?? undefined} alt={profile?.name ?? ""} />
            <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {getInitials(profile?.name ?? "")}
            </AvatarFallback>
          </Avatar>

          <button
            type="button"
            onClick={() => setShowPost(true)}
            className="flex-1 truncate rounded-full bg-muted/60 px-4 py-2.5 text-left text-sm
                       text-muted-foreground transition-colors hover:bg-muted"
          >
            {firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-around gap-2 border-t pt-2">
          <button type="button" onClick={() => setShowPost(true)} className={`${actionClass} flex-1`}>
            <ImagePlus className="h-4 w-4 text-emerald-500" />
            Post
          </button>
          <button type="button" onClick={() => setShowGroup(true)} className={`${actionClass} flex-1`}>
            <Users className="h-4 w-4 text-amber-500" />
            Make Group
          </button>
        </div>
      </div>

      <CreatePostModal
        open={showPost}
        onOpenChange={setShowPost}
        onPostCreated={() => {
          onPostCreated();
          setShowPost(false);
        }}
      />

      <CreateCommunityModal open={showGroup} onOpenChange={setShowGroup} />
    </>
  );
};

export default PostComposerStrip;
