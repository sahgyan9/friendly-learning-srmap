import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";

const PILLARS = [
  {
    icon: MentorIcon,
    title: "Senior mentorship",
    body: "Get 1-on-1 guidance from seniors who took your courses: project advice, course picks and verified peer support.",
    to: "/mentors",
    cta: "Browse mentors",
  },
  {
    icon: FacultyIcon,
    title: "Faculty directory and ratings",
    body: "Find a professor for your research or elective by domain, research interests and anonymous student reviews.",
    to: "/faculty",
    cta: "Search faculty",
  },
  {
    icon: GroupsIcon,
    title: "Teams and campus groups",
    body: "Recruit hackathon teammates, set up a private study workspace or join an interest club with other SRM AP students.",
    to: "/workspace-groups",
    cta: "Find a group",
  },
] as const;

export const EcosystemBento = () => {
  return (
    <section className="border-t border-border bg-secondary/40 py-12 md:py-16">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            What you can do here
          </h2>
          <p className="mt-2 text-muted-foreground">
            Built by SRM AP students to find mentors, form teams and pick the right courses.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body, to, cta }) => (
            <Link
              key={to}
              to={to}
              className="group flex min-w-0 flex-col rounded-xl border border-border bg-card p-6 shadow-card transition-colors duration-150 hover:border-foreground/20"
            >
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {cta}
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
