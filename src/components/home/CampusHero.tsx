import AskBox from "@/components/search/AskBox";
import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";

/**
 * Homepage hero. The search box is the one primary action on the page, so the
 * heading says what it finds and everything else stays out of its way.
 */
export const CampusHero = () => {
  return (
    <section className="border-b border-border bg-background">
      <div className="container mx-auto max-w-3xl px-4 pb-12 pt-12 text-center md:pb-16 md:pt-20">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary animate-fade-up">
          <CampusBrainIcon animate={false} className="h-4 w-4" />
          CampusBrain search
        </p>

        <h1
          className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground animate-fade-up sm:text-4xl md:text-5xl md:leading-[1.08]"
          style={{ animationDelay: "40ms" }}
        >
          Find the right people and answers on campus
        </h1>

        <p
          className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground animate-fade-up md:text-lg"
          style={{ animationDelay: "80ms" }}
        >
          Search mentors, faculty, groups and posts at SRM AP, or ask a question and get an answer that cites its sources.
        </p>

        <div className="mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <AskBox />
        </div>
      </div>
    </section>
  );
};
