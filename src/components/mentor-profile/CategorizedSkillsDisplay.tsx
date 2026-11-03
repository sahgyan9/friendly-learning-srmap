import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface CategorizedSkillsDisplayProps {
  mentor: EnhancedMentor;
}

export default function CategorizedSkillsDisplay({ mentor }: CategorizedSkillsDisplayProps) {
  const categories = Object.entries(mentor.categorized_skills);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Skills</h2>

      <dl className="mt-4 divide-y divide-border">
        {categories.map(([categoryName, skillList]) => (
          <div key={categoryName} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted-foreground">{categoryName}</dt>
            <dd className="flex min-w-0 flex-wrap gap-1.5">
              {skillList.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {skill}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
