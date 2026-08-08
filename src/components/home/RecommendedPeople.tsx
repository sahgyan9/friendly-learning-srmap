import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Sparkles, UserRound, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  allResults,
  askWhoCanHelp,
  metaList,
  metaString,
  type AskResult,
} from "@/integrations/supabase/services/ask";

const CACHE_PREFIX = "rp:";
const PER_TYPE = 3;

type Grouped = {
  faculty: AskResult[];
  mentors: AskResult[];
  students: AskResult[];
};

/**
 * Deterministic profile -> query string.
 *
 * "Deterministic" is the whole point: the semantic-search edge function caches
 * embeddings by normalised query text, so the same profile must always produce
 * the exact same string (stable field order, alphabetically sorted lists,
 * lowercase) or every visit re-embeds for free-form no reason. Returns null
 * when there's nothing to search on — the caller renders a prompt card instead
 * of asking the API to search for "student".
 */
export function buildProfileQuery(
  department: string | null | undefined,
  interests: string[],
  skills: string[],
): string | null {
  if (!department && interests.length === 0) return null;

  const parts: string[] = [];
  if (department) parts.push(`in ${department}`);

  const sortedInterests = [...interests].map((s) => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (sortedInterests.length > 0) parts.push(`interested in ${sortedInterests.join(", ")}`);

  const sortedSkills = [...skills].map((s) => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (sortedSkills.length > 0) parts.push(`skilled in ${sortedSkills.join(", ")}`);

  if (parts.length === 0) return null;
  return `student ${parts.join(" ")}`.trim().toLowerCase();
}

function TypeIcon({ type }: { type: AskResult["entity_type"] }) {
  if (type === "faculty") return <GraduationCap className="h-3 w-3" />;
  if (type === "mentor") return <UserRound className="h-3 w-3" />;
  return <Users className="h-3 w-3" />;
}

function typeLabel(type: AskResult["entity_type"]) {
  if (type === "faculty") return "Faculty";
  if (type === "mentor") return "Mentor";
  return "Student";
}

/** Same visual model as the ResultCard on /ask, compacted for a homepage row. */
function PersonCard({ result }: { result: AskResult }) {
  const tags =
    result.entity_type === "faculty" || result.entity_type === "student"
      ? metaList(result, "interests")
      : metaList(result, "skills");
  const image = metaString(result, "image_url") ?? metaString(result, "profile_image");
  // Students have no public profile route — nothing to link to.
  const linkable = result.entity_type !== "student" && Boolean(result.source_path);

  return (
    <Card className="flex gap-3 p-3 transition-colors hover:border-primary/30">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
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
            <UserRound className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
          <TypeIcon type={result.entity_type} />
          {typeLabel(result.entity_type)}
        </div>
        {linkable ? (
          <Link to={result.source_path} className="line-clamp-1 font-semibold leading-tight hover:underline">
            {result.title}
          </Link>
        ) : (
          <p className="line-clamp-1 font-semibold leading-tight">{result.title}</p>
        )}
        {result.subtitle && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{result.subtitle}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                title={tag}
                className="max-w-[10rem] truncate rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] leading-tight"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function PromptCard() {
  return (
    <section className="container mx-auto px-4 py-6">
      <Card className="flex flex-col items-start justify-between gap-3 border-dashed p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Tell us what you're into</p>
            <p className="text-xs text-muted-foreground">
              Add your interests and we'll show you faculty, mentors and students who match.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full shrink-0 sm:w-auto">
          <Link to="/profile">Update profile</Link>
        </Button>
      </Card>
    </section>
  );
}

function ResultsGrid({ results }: { results: Grouped }) {
  const cards = [...results.faculty, ...results.mentors, ...results.students];
  if (cards.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <h2 className="mb-1 text-lg font-semibold tracking-tight sm:text-xl">
        People who match your interests
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Matched by topic from your profile — not ranked by rating.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((result) => (
          <PersonCard key={`${result.entity_type}-${result.entity_id}`} result={result} />
        ))}
      </div>
    </section>
  );
}

/**
 * Signed-in homepage module: faculty, mentors and students whose listed work
 * matches the viewer's own department/interests/skills.
 *
 * Cost control lives in the query string, not in extra code here: the
 * semantic-search edge function caches embeddings by normalised query text, so
 * a deterministic string means one embedding call per profile change, ever —
 * every other page load for the same profile is a cache hit.
 *
 * The network call is deferred until this module is about to scroll into view
 * (generous rootMargin so it has time to resolve before it's actually seen),
 * and nothing renders until real results exist: no skeleton, no spinner, no
 * error state. A homepage module that sometimes shows a spinner or a "search
 * failed" banner is worse than one that just doesn't appear that load.
 */
export function RecommendedPeople() {
  const { user, profile, loading: authLoading } = useAuth();

  const [interests, setInterests] = useState<string[] | null>(null);
  const [interestsLoaded, setInterestsLoaded] = useState(false);
  const [results, setResults] = useState<Grouped | null>(null);
  const [visible, setVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fetchedRef = useRef(false);

  // Own interests aren't on the shared auth profile (only department/skills
  // are) — one small owned-row read, independent of AuthContext.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.from("users").select("interests").eq("id", user.id).maybeSingle();
        if (cancelled) return;
        setInterests((data?.interests as string[] | undefined) ?? []);
      } catch {
        if (!cancelled) setInterests([]);
      } finally {
        if (!cancelled) setInterestsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const ready = Boolean(user) && !authLoading && interestsLoaded;
  const query = ready
    ? buildProfileQuery(profile?.department ?? null, interests ?? [], profile?.skills ?? [])
    : undefined;

  // Start observing as soon as we know we have something worth fetching.
  useEffect(() => {
    if (!query || fetchedRef.current) return;
    const node = containerRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [query]);

  // The actual fetch, gated on visibility (or first-paint fallback above).
  useEffect(() => {
    if (!query || !visible || fetchedRef.current) return;
    fetchedRef.current = true;

    const cacheKey = CACHE_PREFIX + query;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setResults(JSON.parse(cached) as Grouped);
        return;
      }
    } catch {
      // sessionStorage unavailable (private browsing etc.) — fall through.
    }

    let cancelled = false;
    askWhoCanHelp(query, 24, ["faculty", "mentor", "student"])
      .then(({ data }) => {
        if (cancelled || !data) return;
        const flat = allResults(data);
        const grouped: Grouped = {
          faculty: flat.filter((r) => r.entity_type === "faculty").slice(0, PER_TYPE),
          mentors: flat.filter((r) => r.entity_type === "mentor").slice(0, PER_TYPE),
          students: flat.filter((r) => r.entity_type === "student").slice(0, PER_TYPE),
        };
        if (grouped.faculty.length + grouped.mentors.length + grouped.students.length === 0) return;

        setResults(grouped);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(grouped));
        } catch {
          // Quota or privacy-mode — the module still works, just refetches next time.
        }
      })
      .catch(() => {
        // Never an error state on the homepage.
      });

    return () => {
      cancelled = true;
    };
  }, [query, visible]);

  if (!user) return null;

  return (
    <div ref={containerRef}>
      {ready && query === null && <PromptCard />}
      {query && results && <ResultsGrid results={results} />}
    </div>
  );
}

export default RecommendedPeople;
