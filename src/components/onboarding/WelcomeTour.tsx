import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WELCOME_TOUR_STEPS } from "@/data/welcomeTourSteps";
import { useWelcomeTour } from "@/components/onboarding/WelcomeTourContext";

export function WelcomeTour() {
  const { open, closeTour } = useWelcomeTour();
  const [step, setStep] = useState(0);

  // Every open — first login or a manual replay from the profile menu —
  // starts back at slide one.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isLast = step === WELCOME_TOUR_STEPS.length - 1;
  const current = WELCOME_TOUR_STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeTour()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <DialogDescription className="sr-only">{current.description}</DialogDescription>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-1" aria-hidden>
          {WELCOME_TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25",
              )}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-8 w-8" aria-hidden />
          </div>

          <h2 className="text-xl font-bold">{current.title}</h2>
          <p className="text-sm text-muted-foreground">{current.description}</p>

          {current.cta && (
            <Button asChild variant="outline" size="sm" className="mt-1" onClick={closeTour}>
              <Link to={current.cta.url}>
                {current.cta.label}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={closeTour}>
              Skip
            </Button>
          )}

          <Button size="sm" onClick={() => (isLast ? closeTour() : setStep((s) => s + 1))}>
            {isLast ? "Get started" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WelcomeTour;
