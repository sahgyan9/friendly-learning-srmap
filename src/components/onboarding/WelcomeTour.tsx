import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WELCOME_TOUR_STEPS } from "@/data/welcomeTourSteps";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";

/**
 * Maps an accent token (e.g. "emerald", "rose", "primary") to the Tailwind
 * classes used in three spots:
 *   - icon background + text
 *   - blob fill + pill border/bg
 *   - pill text
 *
 * All classes are spelled out in full so Tailwind's JIT scanner includes them
 * in the bundle — dynamic string interpolation is not picked up.
 */
const ACCENT_CLASSES: Record<
  string,
  { bg: string; text: string; blobBg: string; pillBorder: string; pillBg: string; pillText: string }
> = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    blobBg: "bg-primary/8",
    pillBorder: "border-primary/20",
    pillBg: "bg-primary/10",
    pillText: "text-primary dark:text-primary",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    blobBg: "bg-emerald-500/8",
    pillBorder: "border-emerald-500/20",
    pillBg: "bg-emerald-500/10",
    pillText: "text-emerald-600 dark:text-emerald-400",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    blobBg: "bg-rose-500/8",
    pillBorder: "border-rose-500/20",
    pillBg: "bg-rose-500/10",
    pillText: "text-rose-600 dark:text-rose-400",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    blobBg: "bg-violet-500/8",
    pillBorder: "border-violet-500/20",
    pillBg: "bg-violet-500/10",
    pillText: "text-violet-600 dark:text-violet-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    blobBg: "bg-amber-500/8",
    pillBorder: "border-amber-500/20",
    pillBg: "bg-amber-500/10",
    pillText: "text-amber-600 dark:text-amber-400",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    blobBg: "bg-sky-500/8",
    pillBorder: "border-sky-500/20",
    pillBg: "bg-sky-500/10",
    pillText: "text-sky-600 dark:text-sky-400",
  },
};

// Slide variants: new slides enter from the right, old ones exit to the left.
// The direction ref is toggled on every navigation action so Back slides the
// other way.
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export function WelcomeTour() {
  const { open, closeTour } = useWelcomeTour();
  const [step, setStep] = useState(0);
  const directionRef = useRef(1);

  // Every open — first login or a manual replay from the profile menu —
  // starts back at slide one.
  useEffect(() => {
    if (open) {
      setStep(0);
      directionRef.current = 1;
    }
  }, [open]);

  const isLast = step === WELCOME_TOUR_STEPS.length - 1;
  const current = WELCOME_TOUR_STEPS[step];
  const Icon = current.icon;
  const accent = ACCENT_CLASSES[current.accent] ?? ACCENT_CLASSES.primary;

  const goNext = () => {
    if (isLast) {
      closeTour();
    } else {
      directionRef.current = 1;
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    directionRef.current = -1;
    setStep((s) => s - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeTour()}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <DialogDescription className="sr-only">{current.description}</DialogDescription>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-1" aria-hidden>
          {WELCOME_TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                directionRef.current = i > step ? 1 : -1;
                setStep(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
            />
          ))}
        </div>

        {/* Slide area — fixed height prevents the dialog from jumping between
            slides with different content lengths */}
        <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
          {/* Decorative accent blob — unique per step, fades between colors */}
          <AnimatePresence mode="sync">
            <motion.div
              key={`blob-${current.accent}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl",
                accent.blobBg,
              )}
              aria-hidden
            />
          </AnimatePresence>

          <AnimatePresence mode="popLayout" custom={directionRef.current}>
            <motion.div
              key={step}
              custom={directionRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center gap-4 px-2 pb-2 pt-4 text-center"
            >
              {/* Pill label */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest",
                  accent.pillBorder,
                  accent.pillBg,
                  accent.pillText,
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {step === 0 ? "Welcome" : `Step ${step} of ${WELCOME_TOUR_STEPS.length - 1}`}
              </div>

              {/* Icon circle */}
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-300",
                  accent.bg,
                  accent.text,
                )}
              >
                <Icon className="h-8 w-8" aria-hidden />
              </div>

              <h2 className="text-xl font-bold tracking-tight">{current.title}</h2>
              <p className="max-w-xs text-sm text-muted-foreground">{current.description}</p>

              {current.cta && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={closeTour}
                >
                  <Link to={current.cta.url}>
                    {current.cta.label}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={goBack}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={closeTour}>
              Skip
            </Button>
          )}

          <Button size="sm" onClick={goNext}>
            {isLast ? "Get started" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WelcomeTour;
