import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Smartphone, Download, Share, PlusSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useFeatureSeen } from "@/hooks/useFeatureAnnouncement";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";
import { useSrmDobNag } from "@/components/onboarding/SrmDobNagContext";

const HIDDEN_PATHS = ["/signin", "/signup", "/forgot-password", "/reset-password"];
const PWA_BANNER_FEATURE = "pwa-install-banner-v1";

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { hasSeen, markSeen } = useFeatureSeen(PWA_BANNER_FEATURE);
  const { pathname } = useLocation();

  const welcomeTour = useWelcomeTour();
  const srmDobNag = useSrmDobNag();

  const [delayedVisible, setDelayedVisible] = useState(false);
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  useEffect(() => {
    // If already installed or already dismissed, don't show
    if (isInstalled || hasSeen) {
      setDelayedVisible(false);
      return;
    }

    // On iOS Safari, we can always show the guide if not installed.
    // On Chromium/Android/Desktop, only show if beforeinstallprompt is ready.
    if (!isIOS && !isInstallable) {
      setDelayedVisible(false);
      return;
    }

    // Wait 6 seconds after page load before displaying to let other layout elements settle
    const timer = setTimeout(() => {
      setDelayedVisible(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [isInstalled, hasSeen, isIOS, isInstallable]);

  if (
    !delayedVisible ||
    isInstalled ||
    hasSeen ||
    HIDDEN_PATHS.includes(pathname) ||
    welcomeTour?.open ||
    srmDobNag?.open
  ) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSDialog(true);
      return;
    }

    if (isInstallable) {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("Thank you for installing Friendly Learning SRMAP!");
        markSeen();
      }
    } else {
      toast.info("Look for the install icon (⊕) in your browser address bar or menu (⋮) → 'Install Friendly Learning'");
    }
  };

  const handleDismiss = () => {
    markSeen();
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-24 left-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-primary/25 bg-card/95 backdrop-blur-md p-4 shadow-xl shadow-primary/5 sm:left-6 lg:bottom-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Smartphone className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground">
                  Install Friendly Learning
                </p>
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  App
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Add to your home screen or desktop for fast fullscreen access & instant alerts.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="h-8 px-3 text-xs font-semibold shadow-sm gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isIOS ? "Add to Home Screen" : "Install App"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS Step-by-step Modal Guide */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5" />
              </div>
              <DialogTitle>Install on iPhone / iPad</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Follow these simple steps in Safari to add Friendly Learning to your Home Screen:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-muted/40 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background shadow-xs text-primary">
                <Share className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">1. Tap the Share button</p>
                <p className="text-xs text-muted-foreground">Located at the bottom bar of Safari</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-muted/40 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background shadow-xs text-primary">
                <PlusSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">2. Select &apos;Add to Home Screen&apos;</p>
                <p className="text-xs text-muted-foreground">Scroll down in the share sheet and tap Add to Home Screen</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-muted/40 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background shadow-xs font-bold text-primary">
                Add
              </div>
              <div>
                <p className="font-medium text-foreground">3. Tap &apos;Add&apos; in top right</p>
                <p className="text-xs text-muted-foreground">The app icon will appear instantly on your device home screen</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button className="w-full" onClick={() => { setShowIOSDialog(false); markSeen(); }}>
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PWAInstallBanner;
