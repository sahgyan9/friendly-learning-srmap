import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Lives inline in the header's account cluster rather than floating over the
 * feed — a `fixed` pill above the bottom dock used to sit on top of whatever
 * post had scrolled underneath it. As a normal flex child here it just makes
 * room for itself; nothing it can cover.
 */
export function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence mode="wait">
      {!isOnline && (
        <motion.div
          key="offline-pill"
          initial={{ opacity: 0, scale: 0.9, width: 0 }}
          animate={{ opacity: 1, scale: 1, width: "auto" }}
          exit={{ opacity: 0, scale: 0.9, width: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                role="status"
                aria-live="polite"
                className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                <WifiOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:inline">Offline · showing saved data</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">Offline · showing saved data</TooltipContent>
          </Tooltip>
        </motion.div>
      )}

      {isOnline && showReconnected && (
        <motion.div
          key="reconnected-pill"
          initial={{ opacity: 0, scale: 0.9, width: 0 }}
          animate={{ opacity: 1, scale: 1, width: "auto" }}
          exit={{ opacity: 0, scale: 0.9, width: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            role="status"
            aria-live="polite"
            className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 sm:px-2.5 text-xs font-medium text-foreground"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-600" aria-hidden />
            <Wifi className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only sm:not-sr-only sm:inline">Back online</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineIndicator;
