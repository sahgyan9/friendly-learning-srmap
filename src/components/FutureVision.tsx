import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Phase {
  id: string;
  title: string;
  subtitle: string;
  items: string[];
  status: "live" | "building" | "planned";
}

const phases: Phase[] = [
  {
    id: "discover",
    title: "Discover",
    subtitle: "Find your path",
    items: [
      "Browse and rate faculty before enrolling",
      "Explore peer mentors by subject and year",
      "Find campus events and hackathons",
      "Read community posts and guides",
    ],
    status: "live",
  },
  {
    id: "connect",
    title: "Connect",
    subtitle: "Find your people",
    items: [
      "Find study partners for exams",
      "Build hackathon teams",
      "Join subject communities",
      "Message mentors and collaborators directly",
    ],
    status: "live",
  },
  {
    id: "build",
    title: "Build",
    subtitle: "Do real work",
    items: [
      "Post and collaborate on projects",
      "Find research opportunities with faculty",
      "Form groups that ship real deliverables",
      "Track progress and earn verified certificates",
    ],
    status: "building",
  },
  {
    id: "succeed",
    title: "Succeed",
    subtitle: "Pass it on",
    items: [
      "Graduate with a portfolio of real work",
      "Become a mentor for the next batch",
      "Alumni network for jobs, referrals and guidance",
      "Your profile and reviews stay for the next students",
    ],
    status: "planned",
  },
];

// Status colour carries meaning: green is shipped, amber is in progress, neutral is not started.
const statusLabel: Record<Phase["status"], { text: string; cls: string; dot: string }> = {
  live: { text: "Live", cls: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
  building: { text: "In progress", cls: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  planned: { text: "Planned", cls: "text-muted-foreground", dot: "bg-muted-foreground/50" },
};

const CAMPUS_AI_ITEMS = [
  "Mentor matching on fit, not keyword search",
  "Course recommendations based on your goals",
  "Exam prep grounded in SRM AP syllabi",
  "Question routing to the right professor",
  "Answers about timetables, clubs and deadlines",
];

function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  const sl = statusLabel[phase.status];

  return (
    <li
      className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-6 shadow-card animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="tabular text-sm font-medium text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", sl.cls)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", sl.dot)} aria-hidden />
          {sl.text}
        </span>
      </div>

      <h3 className="text-xl font-semibold tracking-tight text-foreground">{phase.title}</h3>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{phase.subtitle}</p>

      <ul className="flex-1 space-y-2.5 border-t border-border pt-4">
        {phase.items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-sm leading-snug text-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function FutureVision() {
  return (
    <section id="future-vision" className="border-t border-border bg-secondary/40 py-20 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Where Friendly Learning is going
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            From first semester to graduation and after. We are building the platform we wanted when we started at SRM AP.
          </p>
        </div>

        <ol className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {phases.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} index={i} />
          ))}
        </ol>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="grid grid-cols-1 gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:p-12">
            <div className="min-w-0">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Later</p>
              <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
                A campus model built for SRM University AP
              </h3>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                A model built from and for this university, trained on anonymised student interactions, faculty records and
                campus documents. It will answer questions a general search engine cannot, because the answers are specific to
                SRM AP.
              </p>
            </div>

            <ul className="min-w-0 divide-y divide-border self-center border-y border-border">
              {CAMPUS_AI_ITEMS.map((item, i) => (
                <li key={item} className="flex items-start gap-4 py-3">
                  <span className="tabular w-6 shrink-0 text-sm text-muted-foreground">{i + 1}</span>
                  <span className="text-sm leading-snug text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border bg-secondary/50 px-6 py-4 sm:px-10 lg:px-12">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Timeline:</span> phases 3 and 4 are in active development. Work on
              the campus model starts once there is enough student data to train it responsibly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
