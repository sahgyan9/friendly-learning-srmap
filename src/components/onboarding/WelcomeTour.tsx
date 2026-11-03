import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WELCOME_TOUR_STEPS } from "@/data/welcomeTourSteps";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Slide variants: new slides enter from the right, old ones exit to the left.
// The direction ref is toggled on every navigation action so Back slides the
// other way.
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -24 : 24,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export function WelcomeTour() {
  const { open, closeTour } = useWelcomeTour();
  const [step, setStep] = useState(0);
  const directionRef = useRef(1);
  const isMobile = useIsMobile();

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

  const handleCtaClick = () => {
    if (isMobile) {
      closeTour();
      toast.info("Replay the welcome tour anytime", {
        description: "Tap your profile icon at the top right to open the tour again.",
      });
    }
  };

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

        {/* Segmented progress: one bar per step, filled up to the current
            one. Clickable, so people can jump back to something they skipped
            past; the step label under it says where they are in words. */}
        <div className="pr-8">
          <div className="flex gap-1">
            {WELCOME_TOUR_STEPS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  directionRef.current = i > step ? 1 : -1;
                  setStep(i);
                }}
                aria-label={`Go to step ${i + 1}: ${s.label}`}
                aria-current={i === step ? "step" : undefined}
                className="group flex h-4 flex-1 items-center"
              >
                <span
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-300",
                    i <= step ? "bg-primary" : "bg-border group-hover:bg-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground tabular">
            {step + 1} of {WELCOME_TOUR_STEPS.length} · {current.label}
          </p>
        </div>

        {/* Fixed height so the dialog does not jump between slides of
            different lengths. */}
        <div className="relative overflow-hidden" style={{ minHeight: 230 }}>
          <AnimatePresence mode="popLayout" custom={directionRef.current}>
            <motion.div
              key={step}
              custom={directionRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-start gap-3 pb-2 pt-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-secondary text-foreground">
                <Icon className="h-6 w-6" aria-hidden />
              </div>

              <h2 className="mt-1 text-xl font-semibold tracking-tight">{current.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{current.description}</p>

              {current.cta && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleCtaClick}
                >
                  <Link
                    to={current.cta.url}
                    target={isMobile ? undefined : "_blank"}
                    rel={isMobile ? undefined : "noopener noreferrer"}
                  >
                    {current.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WelcomeTour;
