import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const STORAGE_PREFIX = "scrollpos:";

/**
 * The browser's own scroll restoration (history.scrollRestoration = "auto")
 * fires the instant a POP navigation lands — before this page's async
 * sections (mentor cards, faculty stats, top-rated list) have fetched and
 * mounted. It restores to a Y offset the page isn't tall enough for yet,
 * clamps to whatever's currently rendered (often near the bottom of a much
 * shorter page), and never retries once the content grows in. Taking manual
 * control lets us retry until the page has actually grown enough to hold
 * that offset.
 */
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

/**
 * Client-side navigation does not reset scroll position on its own. Landing on
 * a new page still scrolled from wherever the last one left off is usually just
 * a minor jolt — but on Messages, whose chat panel is deliberately sized to
 * fit the viewport, it left the page pre-scrolled with the title and part of
 * the panel shoved up behind the sticky header, reading as "can't scroll."
 *
 * On PUSH/REPLACE (clicking a link) we scroll to top. On POP — the browser's
 * back/forward button — we restore the scroll position this location had
 * when we left it, keyed by the history entry's unique `key` (sessionStorage
 * survives the round trip; pathname alone would collide across repeat visits
 * to the same route).
 */
export function ScrollToTop() {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();
  const scrollYRef = useRef(0);

  // Track live scroll position so it's available the instant we leave this
  // location, regardless of exactly when the route-change effect fires.
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, String(scrollYRef.current));
      window.removeEventListener("scroll", onScroll);
    };
  }, [key]);

  useEffect(() => {
    if (navigationType !== "POP") {
      window.scrollTo(0, 0);
      return;
    }

    const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (saved == null) return;
    const target = Number(saved);

    let cancelled = false;
    const deadline = performance.now() + 3000;
    const tryScroll = () => {
      if (cancelled) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= target || performance.now() > deadline) {
        window.scrollTo(0, target);
      } else {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
    };
  }, [pathname, key, navigationType]);

  return null;
}

export default ScrollToTop;
