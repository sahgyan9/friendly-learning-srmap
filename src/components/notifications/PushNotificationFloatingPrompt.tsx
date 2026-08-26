import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BellRing, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-primary/25 bg-card/95 backdrop-blur-md p-4 shadow-xl shadow-primary/5 sm:right-6 lg:bottom-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <BellRing className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Turn on push alerts
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Never miss mentor replies, messages, and campus opportunities on this device.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={pushLoading}
                className="h-8 px-3 text-xs font-semibold shadow-sm"
              >
                {pushLoading ? "Enabling..." : "Enable Alerts"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Maybe later
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification prompt"
            className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PushNotificationFloatingPrompt;
