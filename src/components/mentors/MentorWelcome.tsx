import { ArrowRight, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CertificatePreview from "@/components/certificate/CertificatePreview";
import { MENTOR_BENEFITS } from "@/data/mentor-benefits";

interface MentorWelcomeProps {
  /** Shown on the sample certificate, so it reads as theirs. */
  name: string;
  onStart: () => void;
  onLeave: () => void;
}

/**
 * Shown before the form rather than dropping people straight into it.
 *
 * Ten required fields in one scroll is the thing that turns people away, and by
 * then they have seen no reason to push through. This page carries the reason.
 *
 * What it deliberately does not do is congratulate anyone. Nothing has been
 * saved at this point — there is no `mentors` row and no `mentor_verification`
 * row until the form is submitted, so anyone told "you're a mentor" here would
 * not be findable, would not be messageable, and would be told the same thing
 * again on their next visit. The celebration belongs on submit, where the
 * insert trigger has actually made it true.
 */
const MentorWelcome = ({ name, onStart, onLeave }: MentorWelcomeProps) => (
  <div className="mx-auto max-w-4xl">
    <div className="mb-10 text-center">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Become a mentor
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
        Your profile goes live as soon as you finish, with no approval queue. Students looking
        for help in your department can find you straight away.
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        Takes about 3 minutes
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button size="lg" onClick={onStart} className="w-full sm:w-auto sm:min-w-56">
          Set up my profile
          <ArrowRight />
        </Button>
        <Button size="lg" variant="ghost" onClick={onLeave} className="w-full sm:w-auto">
          Not right now
        </Button>
      </div>
    </div>

    {/* Two benefits, stacked. They were a 2-up grid when there were five of
        them; with two, a half-width card beside the full-width featured one
        would just leave a hole. */}
    <div className="mb-8 grid gap-4">
      {/* The data file carries per-benefit accent colours; they are ignored
          here so the page stays on the neutral + brand palette. */}
      {MENTOR_BENEFITS.map(({ icon: Icon, title, body, featured }) => (
        <Card key={title}>
          <CardContent className={`flex gap-4 ${featured ? "p-6" : "p-5"}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Icon className="h-5 w-5 text-foreground" />
            </span>
            <div className="space-y-1">
              <h2 className={`font-semibold leading-snug text-foreground ${featured ? "text-lg" : ""}`}>
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="mb-8">
      <CertificatePreview name={name} />
    </div>

    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <p className="mb-4 text-sm text-muted-foreground">
        Three short steps: who you are, where you study, and what you can help with.
      </p>
      <Button size="lg" onClick={onStart} className="w-full sm:w-auto sm:min-w-56">
        Set up my profile
        <ArrowRight />
      </Button>
    </div>
  </div>
);

export default MentorWelcome;
