import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface FacultyResearchShowcaseProps {
  interests: string[];
  researchDetails?: string[] | null;
  department: string;
}

export default function FacultyResearchShowcase({
  interests,
  researchDetails,
  department,
}: FacultyResearchShowcaseProps) {
  const allInterests = interests || [];
  const extraDetails = researchDetails || [];

  if (allInterests.length === 0 && extraDetails.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Research</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No research areas listed. Teaches and researches in the {department} department.
        </p>
      </section>
    );
  }

  // Short entries read as keywords; long ones are sentences describing a project.
  const conciseTags = allInterests.filter((item) => item.length <= 40);
  const detailedStatements = Array.from(
    new Set([
      ...extraDetails,
      ...allInterests.filter((item) => item.length > 40),
    ])
  );

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Research</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an area to see other faculty who work on it.
        </p>
      </div>

      {conciseTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {conciseTags.map((interest) => (
            <Link
              key={interest}
              to={`/faculty?interest=${encodeURIComponent(interest)}`}
              className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
            >
              {interest}
            </Link>
          ))}
        </div>
      )}

      {detailedStatements.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Projects and focus areas</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90 marker:text-muted-foreground">
            {detailedStatements.map((statement, idx) => (
              <li key={idx}>{statement}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
        <span className="text-muted-foreground">Looking for a UROP or BTP guide in this area?</span>
        <Link
          to={`/faculty?dept=${encodeURIComponent(department)}`}
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Browse {department}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
