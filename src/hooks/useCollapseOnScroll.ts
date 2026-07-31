import { useEffect, useRef, useState } from "react";

/**
 * True once the reader has scrolled down past `threshold`, false again as soon
 * as they scroll back up.
 *
 * The header carries two rows on desktop: identity and search on top, the
 * navigation links under them. Both rows stuck to the viewport would cost
 * 112px on every screen, which is a lot to spend on a page whose main job is a
 * scrolling feed. Collapsing the second row on the way down brings that back to
 * 64px while reading, and one upward flick returns it.
 *
 * The subtlety is that a sticky header still occupies space in normal flow, so
 * collapsing it makes the whole document 48px shorter. That reflow can move the
 * scroll position on its own, and a naive direction check reads its own side
 * effect as the user scrolling the other way — which is what made the row
 * shudder open and shut instead of hiding. Both routes into that loop are
 * closed below.
 */
export function useCollapseOnScroll(threshold = 96, collapsibleHeight = 48) {
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const lastY = useRef(0);
  const ticking = useRef(false);
  const settleUntil = useRef(0);

  useEffect(() => {
    // Read in the effect, not during render: this header is prerendered by
    // prerender.js, where `window` does not exist.
    lastY.current = window.scrollY;

    const apply = (next: boolean) => {
      if (collapsedRef.current === next) return;
      collapsedRef.current = next;
      // Long enough to cover the 200ms height transition and the reflow it
      // causes, so none of the scroll events they generate are mistaken for
      // the user changing direction.
      settleUntil.current = performance.now() + 320;
      setCollapsed(next);
    };

    const evaluate = () => {
      ticking.current = false;
      const y = window.scrollY;

      // Route one into the loop: a collapse shortens the document, the browser
      // clamps the scroll position to the new maximum, and that clamp arrives
      // as a scroll event pointing upward. Ignore everything until the header
      // has finished resizing, but keep tracking position so the next real
      // gesture is measured from where the page actually ended up.
      if (performance.now() < settleUntil.current) {
        lastY.current = y;
        return;
      }

      if (y <= threshold) {
        lastY.current = y;
        apply(false);
        return;
      }

      const delta = y - lastY.current;
      // Sub-pixel jitter and the elastic bounce at either end of the document
      // otherwise flip the row back and forth under a trackpad. Leaving lastY
      // untouched below the deadzone lets slow scrolls still accumulate.
      if (Math.abs(delta) < 6) return;
      lastY.current = y;

      // Route two: on a page barely taller than the viewport, collapsing
      // removes the very scroll room that triggered it, the page springs back
      // under the threshold, the row reopens, and round it goes. The height is
      // added back while collapsed so this measures the same page either way —
      // measuring the shortened document would make the answer flip with the
      // state it is meant to decide.
      const scrollable =
        document.documentElement.scrollHeight -
        window.innerHeight +
        (collapsedRef.current ? collapsibleHeight : 0);

      apply(delta > 0 && scrollable > threshold + collapsibleHeight * 2);
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(evaluate);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, collapsibleHeight]);

  return collapsed;
}

export default useCollapseOnScroll;
