import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * The one-time brand intro on a first visit to the homepage.
 *
 * Scope is deliberately narrow:
 * - Homepage only. Someone arriving from Google on a mentor's profile came
 *   for that page; making them sit through a logo first is a cost with no
 *   return. The homepage is where people meet the product.
 * - Once per browser (`INTRO_KEY`), skipped for reduced-motion users and for
 *   automation (prerender, QA harnesses report `navigator.webdriver`).
 * - Any click, tap or key ends it immediately. It is about two seconds long
 *   and must never be in the way.
 *
 * index.html sets `intro-pending` on <html> before first paint under the same
 * conditions, which paints a plain cover so the page does not flash up and
 * then get covered by this. We remove that class once our own overlay is on
 * screen; index.html also removes it after 4s in case this never mounts.
 */
const INTRO_KEY = "fl_intro_seen_v1";
const TOTAL_MS = 2300;

function shouldPlay() {
  try {
    if (window.location.pathname !== "/") return false;
    if (navigator.webdriver) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return localStorage.getItem(INTRO_KEY) !== "1";
  } catch {
    return false;
  }
}

// Mark geometry, in the viewBox of public/logo-mark-light.svg so the intro
// assembles the real logo rather than an approximation of it. The bracket is
// a filled outline in the asset; here it is its centre line, stroked, so it
// can be drawn on.
const VIEWBOX = "201 81 397 421";
const F_PATH = "M286,101L429,101L429,147L335,147L335,199L409,199L409,243L335,243L335,334L286,334Z";
const L_PATH = "M447,243L496,243L496,435L578,435L578,482L447,482Z";
const BRACKET_PATH = "M275 218.5H222.5V350.5H427.5V218.5H540.5V350.5H513";

const ease = [0.25, 1, 0.5, 1] as const;

export default function FirstVisitIntro() {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Storage blocked: the intro may play again next time. Harmless.
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    const play = shouldPlay() && !reducedMotion;
    document.documentElement.classList.remove("intro-pending");
    if (!play) return;
    setVisible(true);
    const timer = window.setTimeout(finish, TOTAL_MS);
    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skip);
    };
  }, [finish, reducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          role="presentation"
          onClick={finish}
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-background"
          initial={{ y: 0 }}
          exit={{ y: "-100%", transition: { duration: 0.6, ease: [0.65, 0, 0.35, 1] } }}
        >
          <div className="flex flex-col items-center gap-6">
            <svg viewBox={VIEWBOX} className="h-24 w-auto md:h-28" aria-hidden>
              <motion.path
                d={BRACKET_PATH}
                fill="none"
                stroke="currentColor"
                strokeWidth={3.5}
                strokeLinejoin="miter"
                className="text-foreground"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
              />
              <motion.path
                d={F_PATH}
                fill="#3963C6"
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.55, ease }}
              />
              <motion.path
                d={L_PATH}
                className="fill-[#374151] dark:fill-[#F8FAFC]"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.55, ease }}
              />
            </svg>

            {/* pb-1 keeps descenders (g, y) inside the mask once the line lands. */}
            <div className="overflow-hidden pb-1">
              <motion.p
                className="flex items-baseline gap-1.5 text-2xl font-bold leading-tight tracking-tight md:text-3xl"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.95, duration: 0.6, ease }}
              >
                <span className="text-primary">Friendly</span>
                <span className="text-foreground">Learning</span>
                <span className="text-sm font-semibold text-primary md:text-base">SRMAP</span>
              </motion.p>
            </div>

            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.5 }}
            >
              Mentors, faculty, groups and events at SRM AP, in one place.
            </motion.p>
          </div>

          {/* Progress hairline: shows the intro is timed and about to end. */}
          <motion.span
            className="absolute bottom-0 left-0 h-0.5 bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: TOTAL_MS / 1000, ease: "linear" }}
            aria-hidden
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="absolute bottom-6 right-6 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
