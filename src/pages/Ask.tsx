import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Search, SearchX, UserRound, GraduationCap, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  askWhoCanHelp,
  metaList,
  metaString,
  type AskResponse,
  type AskResult,
} from "@/integrations/supabase/services/ask";

/**
 * Real questions, not feature names. A blank box invites nothing; these show a
 * fresher that the box takes a sentence rather than a keyword.
 */
const EXAMPLES = [
  "I'm building a machine learning project and need a supervisor",
  "I'm struggling with data structures",
  "Who works on quantum computing?",
  "I want to get into cybersecurity research",
];

function ResultCard({ result }: { result: AskResult }) {
  // Faculty and students list interests; mentors list skills. Same visual role.
  const tags =
    result.entity_type === "faculty" || result.entity_type === "student"
      ? metaList(result, "interests")
      : metaList(result, "skills");
  const image = metaString(result, "image_url") ?? metaString(result, "profile_image");
  // Plain students have no public profile route the way mentors do — nothing
  // to link to, so the title renders as text rather than a link.
  const linkable = result.entity_type !== "student" && Boolean(result.source_path);

  return (
    <Card className="flex min-w-0 gap-3 p-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-top"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserRound className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {linkable ? (
          <Link to={result.source_path} className="font-semibold leading-tight underline-offset-2 hover:text-primary hover:underline">
            {result.title}
          </Link>
        ) : (
          <p className="font-semibold leading-tight">{result.title}</p>
        )}
        {result.subtitle && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{result.subtitle}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                title={tag}
                className="max-w-[16rem] truncate rounded bg-secondary px-1.5 py-0.5 text-2xs leading-tight text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="tabular text-2xs text-muted-foreground">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

const Ask = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) return;

    setLoading(true);
    setError(null);
    const { data, error: searchError } = await askWhoCanHelp(trimmed);
    setResults(data);
    setError(searchError?.message ?? null);
    setLoading(false);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    run(query);
  };

  const canonical = `${PRIMARY_DOMAIN}/ask`;
  const nothingFound = results !== null && results.total === 0;

  return (
    <>
      <SEOHead
        title="Who Can Help? | Find SRM AP Faculty and Senior Mentors by Topic"
        description="Describe what you're working on or stuck on, and find the SRM University-AP faculty who research it and the seniors who've already done it."
        keywords="srm ap project supervisor, find faculty by research area srmap, srm university ap mentor for project"
        canonical={canonical}
      />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Who can help", url: canonical },
        ])}
      />

      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="container mx-auto max-w-3xl px-4 pb-10 pt-16 md:pt-24">
            <p className="mb-3 text-sm font-medium text-primary">Who can help</p>

            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Describe what you are working on
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Get the faculty who research it and the seniors who have already taken the course, in
              one list. Write a full sentence; this is not a keyword box.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="I'm building a project on..."
                  aria-label="Describe what you need help with"
                  className="h-11 pl-10"
                />
              </div>
              <Button type="submit" size="lg" isLoading={loading} disabled={query.trim().length < 3}>
                {loading ? "Searching" : "Find people"}
              </Button>
            </form>

            {results === null && !loading && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Try</span>
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      run(example);
                    }}
                    className="min-h-8 max-w-full truncate rounded-full border border-border bg-card px-3 py-1 text-sm transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto max-w-3xl px-4 py-8">
          {loading && (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-4 w-48" />
              <div className="grid gap-2 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                    <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <span>{error}</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => run(query)} className="shrink-0 self-start sm:self-auto">
                Retry
              </Button>
            </div>
          )}

          {nothingFound && !loading && (
            <div className="rounded-lg border border-dashed border-border py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                <SearchX className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mb-1 text-lg font-medium">Nobody matched that</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Describe the subject rather than the assignment: &ldquo;reinforcement learning&rdquo;
                finds more people than &ldquo;my sem 5 project&rdquo;.
              </p>
            </div>
          )}

          {results && results.total > 0 && !loading && (
            <div className="space-y-8">
              {results.faculty.length > 0 && (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Faculty who research this
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {results.faculty.map((result) => (
                      <ResultCard key={result.entity_id} result={result} />
                    ))}
                  </div>
                </section>
              )}

              {results.mentors.length > 0 && (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Seniors who can help
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {results.mentors.map((result) => (
                      <ResultCard key={result.entity_id} result={result} />
                    ))}
                  </div>
                </section>
              )}

              {/* Absent (undefined) or empty renders nothing — no header, no
                  empty state — same rule as every other group here. */}
              {results.students && results.students.length > 0 && (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Students into this
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {results.students.map((result) => (
                      <ResultCard key={result.entity_id} result={result} />
                    ))}
                  </div>
                </section>
              )}

              {results.mentors.length === 0 && results.faculty.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  No senior mentors match this yet.{" "}
                  <Link to="/become-mentor" className="font-medium text-primary underline underline-offset-2">
                    Add your skills to help peers
                  </Link>
                  .
                </p>
              )}

              {/* Ordering is by topical fit only — never by rating. Said plainly
                  because these are named people and the ranking should not be
                  mistaken for a quality judgement. */}
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                Ranked by how closely their listed work matches what you asked, not by rating.
                Faculty research interests come from the university directory.
              </p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Ask;
