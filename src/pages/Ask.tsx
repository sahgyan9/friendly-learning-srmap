import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, UserRound, GraduationCap, Users, Loader2 } from "lucide-react";

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
    <Card className="flex gap-3 p-3 transition-colors hover:border-primary/30">
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
          <Link to={result.source_path} className="font-semibold leading-tight hover:underline">
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
                className="max-w-[16rem] truncate rounded border border-border bg-muted/60 px-1.5 py-0.5 text-3xs leading-tight"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-3xs text-muted-foreground">+{tags.length - 3}</span>
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
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="container mx-auto max-w-3xl px-4 pb-10 pt-28">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Who can help
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Describe what you're working on.
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              You'll get the faculty who research it and the seniors who've already taken the
              course — in one answer. Write a full sentence; this isn't a keyword box.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="I'm building a project on..."
                  aria-label="Describe what you need help with"
                  className="h-11 pl-10"
                />
              </div>
              <Button type="submit" size="lg" disabled={loading || query.trim().length < 3}>
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {loading ? "Searching" : "Find people"}
              </Button>
            </form>

            {results === null && !loading && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      run(example);
                    }}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto max-w-3xl px-4 py-8">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              {error}
            </div>
          )}

          {nothingFound && (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <h2 className="mb-1 text-lg font-semibold">Nobody matched that</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Try describing the subject rather than the assignment — "reinforcement learning"
                finds more people than "my sem 5 project".
              </p>
            </div>
          )}

          {results && results.total > 0 && (
            <div className="space-y-8">
              {results.faculty.length > 0 && (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
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
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <UserRound className="h-4 w-4" />
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
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Users className="h-4 w-4" />
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
                  <Link to="/become-mentor" className="underline">
                    Be the first
                  </Link>
                  .
                </p>
              )}

              {/* Ordering is by topical fit only — never by rating. Said plainly
                  because these are named people and the ranking should not be
                  mistaken for a quality judgement. */}
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                Ranked by how closely their listed work matches what you asked — not by rating.
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
