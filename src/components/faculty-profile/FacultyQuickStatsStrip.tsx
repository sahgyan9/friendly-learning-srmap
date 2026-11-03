import { Faculty } from "@/integrations/supabase/services/faculty";

interface FacultyQuickStatsStripProps {
  faculty: Faculty;
  interestsCount: number;
}

export default function FacultyQuickStatsStrip({
  faculty,
  interestsCount,
}: FacultyQuickStatsStripProps) {
  const hasRatings = faculty.rating_count > 0;

  const teachingScore = Number(faculty.avg_teaching || faculty.avg_overall || 0);
  const helpfulnessScore = Number(faculty.avg_helpfulness || faculty.avg_overall || 0);

  const getTeachingLabel = (score: number) => {
    if (!hasRatings) return "Awaiting ratings";
    if (score >= 4.5) return "Exceptional clarity";
    if (score >= 4.0) return "Clear and structured";
    if (score >= 3.0) return "Standard pace";
    return "Rigorous material";
  };

  const getHelpfulnessLabel = (score: number) => {
    if (!hasRatings) return "Awaiting ratings";
    if (score >= 4.5) return "Very approachable";
    if (score >= 4.0) return "Helpful with doubts";
    if (score >= 3.0) return "Office hours";
    return "By appointment";
  };

  const cells = [
    {
      label: "Department",
      value: faculty.department,
      meta: interestsCount > 0 ? `${interestsCount} research areas` : faculty.school || "SRM AP faculty",
    },
    {
      label: "Research",
      value: faculty.interests && faculty.interests[0] ? faculty.interests[0] : "Not listed",
      meta: interestsCount > 1 ? `+${interestsCount - 1} more` : " ",
    },
    {
      label: "Teaching",
      value: hasRatings ? `${teachingScore.toFixed(1)} / 5` : "Not rated",
      meta: getTeachingLabel(teachingScore),
    },
    {
      label: "Approachability",
      value: hasRatings ? `${helpfulnessScore.toFixed(1)} / 5` : "Not rated",
      meta: getHelpfulnessLabel(helpfulnessScore),
    },
  ];

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-card lg:grid-cols-4 animate-fade-up">
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={
            "min-w-0 p-4 " +
            // Hairlines between cells rather than four separate boxes.
            (index % 2 === 1 ? "border-l border-border " : "") +
            (index >= 2 ? "border-t border-border lg:border-t-0 " : "") +
            (index === 2 ? "lg:border-l" : "")
          }
        >
          <dt className="text-xs text-muted-foreground">{cell.label}</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-foreground tabular" title={cell.value}>
            {cell.value}
          </dd>
          <dd className="mt-0.5 truncate text-xs text-muted-foreground">{cell.meta}</dd>
        </div>
      ))}
    </dl>
  );
}
