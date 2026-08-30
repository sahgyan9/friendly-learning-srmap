import { useCallback, useRef, useState, type CSSProperties, type TouchEvent } from "react";

/** How far down you have to pull before letting go dismisses rather than snaps back. */
const DISTANCE_THRESHOLD_PX = 96;

/** A short, fast flick dismisses too, well below the distance threshold. */
const VELOCITY_THRESHOLD_PX_PER_MS = 0.5;
const FLICK_MIN_DISTANCE_PX = 32;

/**
 * Resistance past the point where the sheet is already clearly leaving. Pure
 * 1:1 tracking lets a long drag fling the panel far off-screen, which then has
 * a visibly long way to travel back if you change your mind.
 */
const RUBBER_BAND_AFTER_PX = 160;
const RUBBER_BAND_FACTOR = 0.35;

/**
 * Drag-down-to-dismiss for a bottom sheet.
 *
 * Radix's Sheet closes on the overlay, on Escape, and on its close button, but
 * not on the gesture every native bottom sheet has — and this one draws a drag
 * handle, which is a promise that it can be dragged. Pulling it down and having
 * nothing happen is worse than not drawing the handle at all.
 *
 * The gesture only arms when the sheet's own scroller is at the top, so a drag
 * that begins mid-list scrolls the list instead of pulling the panel. That is
 * the one rule that keeps this from fighting the content.
 *
 * Pointer events would cover mouse and pen too, but Radix's dismissable layer
 * already listens for pointerdown to detect outside-clicks; touch events stay
 * clear of it. A mouse can use the handle's click, the overlay, or Escape.
 */
export function useSwipeToDismiss(onDismiss: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  // Null while no gesture is in flight — cheaper to read than `dragging`
  // state inside the move handler, which runs on every frame of the drag.
  const activeRef = useRef(false);

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    // React bubbles a portaled element's events through the *component*
    // tree, not the DOM tree it actually rendered into — so a touch on a
    // sheet nested inside another sheet's JSX (the account sheet lives
    // inside the More sheet's markup, though Radix portals both to
    // <body> as DOM siblings) reaches both sheets' handlers from one
    // gesture. Without this, dragging the top sheet closed the one
    // underneath it too. Stopping here keeps a swipe scoped to whichever
    // sheet's own content it started on.
    event.stopPropagation();

    const scroller = scrollerRef.current;
    if (scroller && scroller.scrollTop > 0) return;

    const touch = event.touches[0];
    if (!touch) return;

    activeRef.current = true;
    startYRef.current = touch.clientY;
    startTimeRef.current = Date.now();
  }, []);

  const onTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!activeRef.current) return;

    const touch = event.touches[0];
    if (!touch) return;

    const delta = touch.clientY - startYRef.current;

    // Upward drags belong to the scroller: hand the gesture back rather than
    // holding onto it and swallowing the scroll.
    if (delta <= 0) {
      if (offset !== 0) setOffset(0);
      setDragging(false);
      return;
    }

    setDragging(true);
    setOffset(
      delta > RUBBER_BAND_AFTER_PX
        ? RUBBER_BAND_AFTER_PX + (delta - RUBBER_BAND_AFTER_PX) * RUBBER_BAND_FACTOR
        : delta,
    );
  }, [offset]);

  const onTouchEnd = useCallback((event: TouchEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!activeRef.current) return;
    activeRef.current = false;

    const travelled = offset;
    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = travelled / elapsed;

    setDragging(false);
    // Reset before closing either way, so Radix's slide-out animation starts
    // from the sheet's resting position instead of jumping back up first.
    setOffset(0);

    if (
      travelled > DISTANCE_THRESHOLD_PX ||
      (travelled > FLICK_MIN_DISTANCE_PX && velocity > VELOCITY_THRESHOLD_PX_PER_MS)
    ) {
      onDismiss();
    }
  }, [offset, onDismiss]);

  const style: CSSProperties = {
    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
    // No transition while the finger is down — the transform should track it
    // exactly — and a short one on release so the snap-back reads as elastic.
    transition: dragging ? "none" : undefined,
  };

  return {
    /** Point this at the element that scrolls, so a mid-list drag scrolls it. */
    scrollerRef,
    /** Spread onto the sheet content. */
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
    style,
    dragging,
  };
}

export default useSwipeToDismiss;
