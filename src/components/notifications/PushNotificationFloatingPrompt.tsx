import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BellRing, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useFeatureSeen } from "@/hooks/useFeatureAnnouncement";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";
import { useSrmDobNag } from "@/components/onboarding/SrmDobNagContext";

const HIDDEN_PATHS = ["/signin", "/signup", "/forgot-password", "/reset-password"];
const PUSH_PROMPT_FEATURE = "push-prompt-v1";

/**
 * A floating, non-intrusive prompt asking signed-in users to enable browser push notifications.
 * Strictly designed to NEVER coincide or overlap with:
 * 1. SignInNudge (only shown when signed out)
 * 2. WelcomeTour modal dialog
 * 3. SrmDobNag modal dialog
 * 4. Auth routes
 */
export function PushNotificationFloatingPrompt() {
  const { user, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const { isSupported, isSubscribed, permission, enablePush, isLoading: pushLoading } = usePushNotifications();
  const { hasSeen, markSeen } = useFeatureSeen(PUSH_PROMPT_FEATURE);
  
  const welcomeTour = useWelcomeTour();
  const srmDobNag = useSrmDobNag();

  const [delayedVisible, setDelayedVisible] = useState(false);

  useEffect(() => {
    // Only arm timer if candidate for prompt
    if (authLoading || !user || !isSupported || isSubscribed || hasSeen || permission === "denied" || permission === "granted") {
      setDelayedVisible(false);
      return;
    }

    // Wait 3.5 seconds after page load before displaying to let other layout elements settle
    const timer = setTimeout(() => {
      setDelayedVisible(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, [authLoading, user, isSupported, isSubscribed, hasSeen, permission]);

  // Guard against displaying during conflicting dialogs or states
  if (
    !delayedVisible ||
    authLoading ||
    !user ||
    !isSupported ||
    isSubscribed ||
    hasSeen ||
    permission === "denied" ||
    permission === "granted" ||
    HIDDEN_PATHS.includes(pathname) ||
    welcomeTour?.open ||
    srmDobNag?.open
  ) {
    return null;
  }

  const handleEnable = async () => {
    const success = await enablePush();
    markSeen();
  };

  const handleDismiss = () => {
    markSeen();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="push-prompt-title"
      className="fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm animate-fade-up rounded-lg border bg-card p-4 shadow-float sm:right-6 lg:bottom-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
          <BellRing className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p id="push-prompt-title" className="text-sm font-semibold text-foreground">
            Turn on push alerts
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Get mentor replies, messages and event reminders on this device, even with the tab closed.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={handleEnable} isLoading={pushLoading}>
              Turn on
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default PushNotificationFloatingPrompt;
