import { Link } from "react-router-dom";
import { BookOpen, Search, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { Badge } from "@/components/ui/badge";

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
      <Card className="relative overflow-hidden shadow-xs">
        <CardAccentBorder gradient="rose" />
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-base font-bold text-foreground">Academic Focus & Research</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Specializes in teaching and research within the {department} department.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate concise domain tags from detailed research statements
  const conciseTags = allInterests.filter((item) => item.length <= 40);
  const detailedStatements = Array.from(
    new Set([
      ...extraDetails,
      ...allInterests.filter((item) => item.length > 40),
    ])
  );

  return (
    <Card className="relative overflow-hidden shadow-xs">
      <CardAccentBorder gradient="rose" />
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Research Areas & Specializations
              </h2>
              <p className="text-xs text-muted-foreground">
                Topics, specializations, and focus areas
              </p>
            </div>
          </div>

          <Badge variant="outline" className="self-start sm:self-auto text-xs font-normal">
            {conciseTags.length > 0 ? `${conciseTags.length} tags` : `${interests.length} topics`}
          </Badge>
        </div>

        {/* Detailed Research Statements / Focus Areas (if present) */}
        {detailedStatements.length > 0 && (
          <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-rose-500" />
              <span>Key Research Projects & Focus Areas</span>
            </div>
            <ul className="space-y-2 text-xs md:text-sm text-foreground/90 leading-relaxed">
              {detailedStatements.map((statement, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{statement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concise Domain Chips */}
        {conciseTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Domain keywords (click to see other faculty in this domain):
            </p>
            <div className="flex flex-wrap gap-2">
              {conciseTags.map((interest) => (
                <Link
                  key={interest}
                  to={`/faculty?interest=${encodeURIComponent(interest)}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/5 px-3 py-1.5 text-xs font-medium text-rose-700 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                >
                  <span>{interest}</span>
                  <Search className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Department Link Callout */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center justify-between">
          <span>Looking for Research Projects, UROP, or BTP guidance in these domains?</span>
          <Link
            to={`/faculty?dept=${encodeURIComponent(department)}`}
            className="font-medium text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 shrink-0 ml-2"
          >
            Explore Department
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
