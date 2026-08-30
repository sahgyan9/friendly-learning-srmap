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
                className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-700/50 bg-slate-900/90 px-2 sm:px-2.5 text-xs font-medium text-slate-100 shadow-xs dark:bg-slate-800/95"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:inline">Offline mode • Showing saved data</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">Offline mode • Showing saved data</TooltipContent>
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
            className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-700/50 bg-emerald-900/90 px-2 sm:px-2.5 text-xs font-medium text-emerald-100 shadow-xs dark:bg-emerald-950/95"
          >
            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            <span className="sr-only sm:not-sr-only sm:inline">Back online • Reconnected</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineIndicator;
