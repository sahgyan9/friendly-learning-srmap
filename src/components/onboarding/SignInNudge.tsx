import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { LogIn, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useFeatureSeen } from "@/hooks/useFeatureAnnouncement";

const HIDDEN_PATHS = ["/signin", "/signup", "/forgot-password", "/reset-password"];

const SIGN_IN_NUDGE_FEATURE = "signed-out-nudge-v1";

/**
 * A quiet nudge for people browsing signed out, not a wall in front of the
 * content. A modal on someone's very first pageview reads as pushy — this
 * sits in the corner and can be dismissed for good.
 */
const SignInNudge = () => {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const { hasSeen, markSeen } = useFeatureSeen(SIGN_IN_NUDGE_FEATURE);

  if (loading || user || hasSeen || HIDDEN_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border/80 bg-card p-4 shadow-lg sm:bottom-6 sm:right-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LogIn className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">New here?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sign in to message mentors, join communities, and save what you find.
          </p>
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" onClick={markSeen}>
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={markSeen}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={markSeen}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default SignInNudge;
