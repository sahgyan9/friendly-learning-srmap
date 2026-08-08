import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";

const STORAGE_PREFIX = "scrollpos:";

/**
 * Disable the browser's own scroll restoration. The browser fires it before
 * async content (cards, stats) has had a chance to mount, so it clamps to
 * whatever height is available right now — which is "not very much" on a
 * lazy-loaded page — and never retries. We take over with our own retry loop.
 */
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export function ScrollToTop() {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();

  // Last real scrollY seen on the CURRENT page, updated only by genuine
  // scroll events (see below for why this can't just be a live window.scrollY
  // read at save time).
  const lastScrollYRef = useRef(0);

  // Save scroll position eagerly on every scroll event, not just on unmount.
  // This ensures the position is available even if the component teardown and
  // the new mount happen in the same React batch (which can skip the cleanup).
  //
  // This must be a layout effect, not a passive one, and the teardown save
  // must use lastScrollYRef rather than a fresh window.scrollY read. When
  // navigating to a shorter page, the DOM is already swapped to the new
  // (often shorter) page by the time ANY effect for this commit runs —
  // passive or layout. Reading window.scrollY at that point forces a layout
  // pass against the *new* DOM and can come back already clamped to fit it,
  // which has nothing to do with the page we're saving position for. Passive
  // effects make it worse: the browser can paint and dispatch its own async
  // clamp "scroll" event — caught by the *old* listener, since it hasn't been
  // swapped out yet — before the passive effect even runs. A layout effect
  // swaps the listener synchronously before paint, closing that race; using
  // lastScrollYRef (updated only from real scroll events while this page's
  // DOM was actually on screen) closes the forced-layout race too.
  useIsomorphicLayoutEffect(() => {
    lastScrollYRef.current = 0;

    const save = (y: number) => {
      if (y > 0) {
        sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, String(y));
      }
    };

    const onScroll = () => {
      lastScrollYRef.current = window.scrollY;
      save(window.scrollY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      // Final save on teardown as a safety net.
      save(lastScrollYRef.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, [key]);

  // On PUSH/REPLACE: scroll to top.
  // On POP (browser back/forward or navigate(-1)): restore saved position with
  // a retry loop so async content has time to grow the document tall enough.
  useEffect(() => {
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      return;
    }

    const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!saved) return;

    const target = Number(saved);
    if (!target || target <= 0) return;

    let cancelled = false;
    const started = performance.now();
    const MAX_WAIT_MS = 4000;

    const attempt = () => {
      if (cancelled) return;

      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      const canScroll = docHeight - viewHeight;

      if (canScroll >= target) {
        // Document is tall enough — scroll and schedule two follow-up checks
        // in case a lazy image or card expands below us after we land.
        window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
        setTimeout(() => { if (!cancelled) window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior }); }, 100);
        setTimeout(() => { if (!cancelled) window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior }); }, 400);
      } else if (performance.now() - started < MAX_WAIT_MS) {
        // Not tall enough yet — wait for next paint and try again.
        requestAnimationFrame(attempt);
      } else {
        // Timed out — scroll as far as we can.
        window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
      }
    };

    requestAnimationFrame(attempt);

    return () => {
      cancelled = true;
    };
  }, [pathname, key, navigationType]);

  return null;
}

export default ScrollToTop;
