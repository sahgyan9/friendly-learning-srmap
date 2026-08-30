import { memo } from "react";
import { ArrowDown, Check, Loader2, Sparkles, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePullToRefresh, type PullToRefreshStatus } from "@/hooks/usePullToRefresh";

interface PullToRefreshIndicatorProps {
  status: PullToRefreshStatus;
  pullDistance: number;
  progress: number;
  className?: string;
}

export const PullToRefreshIndicator = memo(function PullToRefreshIndicator({
  status,
  pullDistance,
  progress,
  className,
}: PullToRefreshIndicatorProps) {
  if (status === "idle" && pullDistance === 0) {
    return null;
  }

  const isThreshold = status === "threshold-reached";
  const isRefreshing = status === "refreshing";
  const isSuccess = status === "success";
  const isOffline = status === "offline";

  // Visual displacement calculation (bounded smooth translation)
  const displayY = isRefreshing || isSuccess || isOffline ? 54 : Math.min(pullDistance * 0.75 + 10, 72);

  return (
    <div
      className={cn(
        // z-[60] beats SiteHeader's sticky z-50 — same top-0, so without a
        // higher layer the header (mounted after this in App.tsx) paints
        // over the badge and only a sliver shows below the navbar.
        "fixed inset-x-0 top-0 z-[60] pointer-events-none flex justify-center",
        className,
      )}
      aria-hidden="true"
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.85 }}
        animate={{
          opacity: status !== "idle" ? 1 : 0,
          y: displayY,
          scale: isThreshold ? 1.06 : isRefreshing || isSuccess ? 1 : Math.max(0.85, Math.min(progress, 1)),
        }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 26,
        }}
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-lg border text-xs font-semibold select-none",
          "backdrop-blur-md transition-colors duration-200",
          isSuccess
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            : isOffline
              ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
              : isThreshold
                ? "bg-primary/15 border-primary/40 text-primary shadow-primary/10"
                : "bg-background/90 dark:bg-card/90 border-border/80 text-foreground/85",
        )}
      >
        {/* State Icons */}
        <div className="relative flex items-center justify-center w-4 h-4">
          <AnimatePresence mode="wait">
            {isOffline ? (
              <motion.div
                key="offline"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 20 }}
              >
                <WifiOff className="w-4 h-4 text-amber-500 stroke-[2.5]" />
              </motion.div>
            ) : isSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 20 }}
              >
                <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
              </motion.div>
            ) : isRefreshing ? (
              <motion.div
                key="refreshing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-primary stroke-[2.5]" />
              </motion.div>
            ) : (
              <motion.div
                key="pulling"
                style={{
                  transform: `rotate(${Math.min(progress * 180, 180)}deg)`,
                  transition: "transform 0.1s ease-out",
                }}
              >
                <ArrowDown
                  className={cn(
                    "w-4 h-4 transition-colors stroke-[2.5]",
                    isThreshold ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* State Label */}
        <span className="tracking-wide">
          {isOffline
            ? "You're offline"
            : isSuccess
              ? "Updated"
              : isRefreshing
                ? "Refreshing…"
                : isThreshold
                  ? "Release to refresh"
                  : "Pull to refresh"}
        </span>
      </motion.div>
    </div>
  );
});

/**
 * Global PullToRefresh listener component.
 * Place inside the root layout or App to enable touch pull-to-refresh app-wide.
 */
export function GlobalPullToRefresh({
  onRefresh,
  disabled = false,
}: {
  onRefresh?: () => Promise<unknown> | void;
  disabled?: boolean;
}) {
  const { status, pullDistance, progress } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  return (
    <PullToRefreshIndicator
      status={status}
      pullDistance={pullDistance}
      progress={progress}
    />
  );
}

export default GlobalPullToRefresh;
