import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Client-side navigation does not reset scroll position on its own. Landing on
 * a new page still scrolled from wherever the last one left off is usually just
 * a minor jolt — but on Messages, whose chat panel is deliberately sized to
 * fit the viewport, it left the page pre-scrolled with the title and part of
 * the panel shoved up behind the sticky header, reading as "can't scroll."
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;
