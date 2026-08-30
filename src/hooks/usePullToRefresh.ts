import { useEffect, useRef, useState, useCallback } from "react";
import { triggerHaptic } from "@/lib/haptics";

export type PullToRefreshStatus =
  | "idle"
  | "pulling"
  | "threshold-reached"
  | "refreshing"
  | "success"
  | "offline";

interface UsePullToRefreshOptions {
  onRefresh?: () => Promise<unknown> | void;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 68,
  maxPull = 115,
  disabled = false,
}: UsePullToRefreshOptions = {}) {
  const [status, setStatus] = useState<PullToRefreshStatus>("idle");
  const [pullDistance, setPullDistance] = useState(0);

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const reachedThresholdRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const isModalOrInputOpen = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;

    // Don't intercept if typing in input or editor
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable ||
      target.closest("input, textarea, [contenteditable='true']")
    ) {
      return true;
    }

    // Don't intercept if an interactive modal or drawer is active
    if (
      document.querySelector('[role="dialog"]') !== null ||
      document.querySelector('[data-state="open"][role="alertdialog"]') !== null
    ) {
      return true;
    }

    // Check if target is inside an inner vertically scrolled element
    let el: HTMLElement | null = target;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollHeight > el.clientHeight && el.scrollTop > 0) {
        return true;
      }
      el = el.parentElement;
    }

    return false;
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    // Nothing to fetch without a connection — the per-page listeners we
    // dispatch to below don't report success/failure back to us (they're
    // fire-and-forget), so without this check a failed offline fetch still
    // reads the fixed timeout below as a win and claims "Updated".
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline");
      setPullDistance(52);
      triggerHaptic("warning");
      await new Promise((res) => setTimeout(res, 900));
      setStatus("idle");
      setPullDistance(0);
      isRefreshingRef.current = false;
      reachedThresholdRef.current = false;
      return;
    }

    setStatus("refreshing");
    setPullDistance(52); // Hold at indicator resting height

    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        // Default global refresh: dispatch custom fl:refresh event
        const refreshEvent = new CustomEvent("fl:refresh", {
          cancelable: true,
          detail: { timestamp: Date.now() },
        });
        const notHandled = window.dispatchEvent(refreshEvent);

        // If no custom event handler captured it, wait brief moment to simulate smooth revalidation
        if (notHandled) {
          await new Promise((res) => setTimeout(res, 600));
        } else {
          await new Promise((res) => setTimeout(res, 400));
        }
      }

      setStatus("success");
      triggerHaptic("success");
      await new Promise((res) => setTimeout(res, 450));
    } catch (err) {
      console.warn("[PullToRefresh] Refresh action encountered an error:", err);
      setStatus("idle");
    } finally {
      setStatus("idle");
      setPullDistance(0);
      isRefreshingRef.current = false;
      reachedThresholdRef.current = false;
    }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 2) return; // Only trigger at the very top of the page

      if (isModalOrInputOpen(e.target)) return;

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = false;
      reachedThresholdRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || startXRef.current === null || isRefreshingRef.current) {
        return;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 2) {
        startYRef.current = null;
        isPullingRef.current = false;
        setPullDistance(0);
        setStatus("idle");
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // If user is swiping horizontally (like drawer / carousel), cancel pull
      if (!isPullingRef.current && Math.abs(diffX) > Math.abs(diffY)) {
        startYRef.current = null;
        return;
      }

      // Only handle downward pull
      if (diffY > 5) {
        isPullingRef.current = true;

        // Logarithmic dampening resistance curve for realistic iOS rubber-banding
        const distance = Math.min(Math.pow(diffY, 0.82) * 2.0, maxPull);
        setPullDistance(distance);

        if (distance >= threshold) {
          if (!reachedThresholdRef.current) {
            reachedThresholdRef.current = true;
            triggerHaptic("light"); // Instant haptic tick at threshold crossing
          }
          setStatus("threshold-reached");
        } else {
          if (reachedThresholdRef.current) {
            reachedThresholdRef.current = false;
          }
          setStatus("pulling");
        }

        // Prevent native overscroll glitch if cancelable
        if (e.cancelable && diffY > 15) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current || isRefreshingRef.current) {
        startYRef.current = null;
        startXRef.current = null;
        return;
      }

      isPullingRef.current = false;
      startYRef.current = null;
      startXRef.current = null;

      if (reachedThresholdRef.current) {
        triggerHaptic("medium");
        handleRefresh();
      } else {
        setStatus("idle");
        setPullDistance(0);
      }
    };

    const options = { passive: false };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, options);
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [disabled, threshold, maxPull, handleRefresh]);

  const progress = Math.min(pullDistance / threshold, 1.5);

  return {
    status,
    pullDistance,
    progress,
    isRefreshing: status === "refreshing",
    manualRefresh: handleRefresh,
  };
}
