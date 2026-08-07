import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface HorizontalScrollerProps {
  children: ReactNode;
  /** Classes for the scrollable track itself (layout of its children, spacing, etc). */
  className?: string;
  /** Share the scroll element with a parent that needs its own scroll listener (e.g. active-card tracking). */
  scrollRef?: RefObject<HTMLDivElement>;
  /** Gradient start color for the edge fades — match the surface the row sits on. */
  fadeFrom?: string;
  /** Width of the fade + arrow zone. */
  edgeWidth?: string;
  /** Pixels to scroll per arrow click. */
  scrollAmount?: number;
  arrowSize?: "sm" | "md";
  ariaLabel: string;
  /** Set false when the track already renders its own visible scrollbar as a cue (e.g. `scrollbar-width: thin`). */
  hideScrollbar?: boolean;
}

/**
 * Wraps a horizontally-scrolling row with a persistent, professional
 * "there's more" cue: edge fades that track scroll position, plus
 * hover-reveal arrow buttons on desktop.
 *
 * This is not a one-time onboarding hint — it has no dismissed/seen state.
 * The fades reflect live scroll position, so the cue is correct and visible
 * every time there's more content, for every visitor, every visit.
 */
export function HorizontalScroller({
  children,
  className,
  scrollRef,
  fadeFrom = "from-background",
  edgeWidth = "w-10",
  scrollAmount = 240,
  arrowSize = "sm",
  ariaLabel,
  hideScrollbar = true,
}: HorizontalScrollerProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const trackRef = scrollRef ?? internalRef;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [trackRef]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges, { passive: true });

    // Content can change width after mount (async data, images, fonts)
    // without ever firing a scroll or resize event — an observer is what
    // keeps the fades honest in that case.
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
      observer.disconnect();
    };
  }, [trackRef, updateEdges, children]);

  const scrollBy = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  };

  const arrowSizeClass = arrowSize === "md" ? "h-9 w-9" : "h-7 w-7";

  return (
    <div className="group/scroller relative">
      <div
        ref={trackRef}
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "overflow-x-auto",
          hideScrollbar && "scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
      </div>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r to-transparent transition-opacity duration-200",
          edgeWidth,
          fadeFrom,
          canScrollLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 bg-gradient-to-l to-transparent transition-opacity duration-200",
          edgeWidth,
          fadeFrom,
          canScrollRight ? "opacity-100" : "opacity-0",
        )}
      />

      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll left"
        tabIndex={canScrollLeft ? 0 : -1}
        className={cn(
          "absolute left-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-accent md:flex",
          arrowSizeClass,
          canScrollLeft
            ? "opacity-0 group-hover/scroller:opacity-100 focus-visible:opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll right"
        tabIndex={canScrollRight ? 0 : -1}
        className={cn(
          "absolute right-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-accent md:flex",
          arrowSizeClass,
          canScrollRight
            ? "opacity-0 group-hover/scroller:opacity-100 focus-visible:opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default HorizontalScroller;
