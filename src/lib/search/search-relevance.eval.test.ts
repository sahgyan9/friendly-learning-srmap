import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseQuery } from "@/lib/search/query-engine";
import { normaliseSimilarity, scoreResult, type RankedEntityType } from "@/lib/search/relevance";

/**
 * Relevance eval — the regression net for search ranking.
 *
 * Every ranking change before this one was tuned by looking at a single query
 * and hoping. That is how a mentor came to outrank twelve ML professors on
 * "machine learning faculty", and how Code of Conduct sections came to answer
 * questions about outpasses: both were visible on one query and invisible on
 * the twenty others nobody re-checked.
 *
 * WHAT THIS COVERS: live retrieval from search_knowledge plus the re-ranking
 * in relevance.ts — the two layers that decide which section wins the page.
 *
 * WHAT IT DOES NOT COVER: the lexical merge in useSearchResults (searchMentors,
 * getFacultyList and friends), which needs a browser and a signed-in session.
 * A green run here means retrieval and intent are sound, not that the rendered
 * page is. Treat a regression here as proof of a bug; treat a pass as the
 * absence of *this* class of bug only.
 *
 * Excluded from `npm test` by vitest.config.ts — it hits production and spends
 * Gemini embedding quota. Run it deliberately after any ranking change:
 *
 *   npm run eval:search
 */

/** Two of the top three must be on topic. One out of three is a bad page. */
const MIN_PRECISION_AT_3 = 0.66;

interface EvalCase {
  query: string;
  /** The section a student would expect to see first. */
  expectSection: RankedEntityType;
  /** Substrings, any of which appearing in the top 3 counts as a good page. */
  expectTop?: string[];
  /** Types that must NOT take the top slot — the failures we have actually shipped. */
  forbidTop?: RankedEntityType[];
}

const CASES: EvalCase[] = [
  // ── People, by role. The word in the query decides which kind of person. ──
  { query: "machine learning faculty", expectSection: "faculty", expectTop: ["machine learning", "artificial intelligence", "deep learning"], forbidTop: ["mentor", "document"] },
  { query: "who can help me with a machine learning project", expectSection: "mentor", forbidTop: ["document"] },
  { query: "senior mentor for data structures", expectSection: "mentor", forbidTop: ["faculty", "document"] },
  { query: "quantum computing professor", expectSection: "faculty", forbidTop: ["mentor", "document"] },
  { query: "physics faculty", expectSection: "faculty", forbidTop: ["mentor"] },
  { query: "i am a fresher and want help from faculty", expectSection: "faculty", forbidTop: ["document"] },
  { query: "mentor who knows web development", expectSection: "mentor", forbidTop: ["faculty", "document"] },
  { query: "cybersecurity research faculty", expectSection: "faculty", forbidTop: ["mentor"] },

  // ── Policy. These are the queries documents SHOULD win. ──
  { query: "what is the attendance penalty", expectSection: "document" },
  { query: "what are the rules i need to follow as a student", expectSection: "document" },
  { query: "academic calendar midterm dates", expectSection: "document" },
  { query: "hostel curfew timing", expectSection: "document" },

  // ── Dates. The same question with and without the qualifiers a real student
  // types. The short form always worked; the long one returned 23 faculty and
  // zero guidelines, because "cse" expanded to the department phrase that sits
  // in every faculty chunk. Both must land in the same place. ──
  { query: "when are midterms", expectSection: "document", forbidTop: ["faculty", "mentor"] },
  { query: "when are midterms for btech cse 7th sem starting", expectSection: "document", forbidTop: ["faculty", "mentor"] },
  { query: "when does the semester end for ece 3rd year", expectSection: "document", forbidTop: ["faculty", "mentor"] },
  { query: "last date to pay the fee", expectSection: "document", forbidTop: ["faculty", "mentor"] },

  // ── Exact terms. What the keyword leg (20260831160000) is for: the phrase
  // appears verbatim in a policy heading, and an embedding blurs it. ──
  { query: "attendance shortfall", expectSection: "document", forbidTop: ["faculty", "mentor"] },

  // ── Activities. Neither people nor policy. ──
  { query: "upcoming hackathons", expectSection: "opportunity", forbidTop: ["document", "faculty"] },
  { query: "smart india hackathon", expectSection: "opportunity", forbidTop: ["document"] },
  { query: "robotics club", expectSection: "community", forbidTop: ["document"] },
  { query: "student groups for competitive programming", expectSection: "community", forbidTop: ["document"] },

  // ── Discussion. ──
  { query: "discussion about internship experience", expectSection: "post", forbidTop: ["document"] },

  // ── Broad topical queries with no role word: must not fall through to policy. ──
  { query: "artificial intelligence", expectSection: "faculty", forbidTop: ["document"] },
  { query: "internet of things", expectSection: "faculty", forbidTop: ["document"] },
  { query: "how do i choose my electives", expectSection: "document", forbidTop: ["mentor"] },
];

interface KnowledgeHit {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  similarity: number;
  /** 0-1 full-text rank from the keyword leg; 0 when only the vector leg matched. */
  keyword_rank?: number;
  metadata?: Record<string, unknown> | null;
}

function readEnv(): { url: string; key: string } {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  const pick = (name: string) => {
    const match = raw.match(new RegExp(`^${name}\\s*=\\s*"?([^"\\r\\n]+)"?`, "m"));
    if (!match) throw new Error(`${name} missing from .env`);
    return match[1].trim();
  };
  return { url: pick("VITE_SUPABASE_URL"), key: pick("VITE_SUPABASE_ANON_KEY") };
}

async function retrieve(
  parsed: ReturnType<typeof parseQuery>,
  url: string,
  key: string,
): Promise<KnowledgeHit[]> {
  const response = await fetch(`${url}/functions/v1/semantic-search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    // Same limit, same variants and same reserved slots useSearchResults asks
    // for. An eval that sends a single distilled query measures a pipeline
    // nobody runs, and would have scored the midterms regression as a pass.
    body: JSON.stringify({
      query: parsed.semanticQuery,
      queries: parsed.retrievalQueries,
      limit: 20,
      ...(parsed.targetCategory === "documents"
        ? { ensure_types: ["document", "notice", "article"], ensure_limit: 4 }
        : {}),
    }),
  });

  if (!response.ok) throw new Error(`semantic-search ${response.status}: ${await response.text()}`);

  const data = (await response.json()) as Record<string, KnowledgeHit[] | unknown>;
  const groups = ["faculty", "mentors", "students", "opportunities", "communities", "posts", "documents", "notices", "articles", "other"];
  return groups.flatMap((group) => (Array.isArray(data[group]) ? (data[group] as KnowledgeHit[]) : []));
}

/** search_knowledge's group names vs the singular entity types ranking uses. */
const AS_ENTITY: Record<string, RankedEntityType> = {
  faculty: "faculty",
  mentor: "mentor",
  student: "student",
  opportunity: "opportunity",
  community: "community",
  post: "post",
  document: "document",
  notice: "document",
  article: "document",
};

interface Ranked {
  type: RankedEntityType;
  title: string;
  /** Everything a reader would see on the card — expectTop matches against this,
   *  not the title, because a faculty card's title is a person's name and the
   *  topic lives in their interests. */
  text: string;
  score: number;
  similarity: number;
}

function rank(query: string, hits: KnowledgeHit[]): Ranked[] {
  const parsed = parseQuery(query);

  return hits
    .flatMap((hit) => {
      const type = AS_ENTITY[hit.entity_type];
      if (!type) return [];
      const interests = Array.isArray(hit.metadata?.interests) ? (hit.metadata.interests as string[]).join(" ") : "";
      return [{
        type,
        title: hit.title,
        text: `${hit.title} ${hit.subtitle ?? ""} ${interests} ${hit.body ?? ""}`.toLowerCase(),
        similarity: hit.similarity,
        // `keyword_rank` is the lexical evidence the keyword leg found, and it
        // is what useSearchResults now passes for documents. Omitting it here
        // would leave the heaviest weight in relevance.ts (lexical, 46 vs
        // semantic's 40) untested on the one entity type that had no lexical
        // signal at all until 20260831160000.
        //
        // People still score semantic-only, matching the app: their lexical
        // evidence comes from a separate SQL query this path does not run.
        score: scoreResult(
          type,
          {
            similarity: hit.similarity,
            ...(type === "document" ? { lexical: hit.keyword_rank ?? 0 } : {}),
          },
          parsed.targetCategory,
        ),
      }];
    })
    .sort((a, b) => b.score - a.score);
}

/** The section that would render first: highest-scoring result per type wins. */
function topSection(ranked: Ranked[]): RankedEntityType | null {
  return ranked.length > 0 ? ranked[0].type : null;
}

describe("search relevance (live)", () => {
  it(
    "ranks the expected section first on real campus queries",
    async () => {
      const { url, key } = readEnv();
      const rows: string[] = [];
      const failures: string[] = [];

      for (const testCase of CASES) {
        const parsed = parseQuery(testCase.query);

        let ranked: Ranked[] = [];
        try {
          ranked = rank(testCase.query, await retrieve(parsed, url, key));
        } catch (error) {
          failures.push(`${testCase.query} — retrieval failed: ${(error as Error).message}`);
          continue;
        }

        const winner = topSection(ranked);
        const top3 = ranked.slice(0, 3);

        const sectionOk = winner === testCase.expectSection;
        const forbidOk = !testCase.forbidTop?.includes(winner as RankedEntityType);

        let precision = 1;
        if (testCase.expectTop) {
          const hits = top3.filter((row) =>
            testCase.expectTop!.some((needle) => row.text.includes(needle.toLowerCase())),
          ).length;
          precision = top3.length > 0 ? hits / top3.length : 0;
        }

        const verdict = sectionOk && forbidOk ? "PASS" : "FAIL";
        rows.push(
          `${verdict}  ${testCase.query.padEnd(48)} want=${testCase.expectSection.padEnd(11)} got=${(winner ?? "none").padEnd(11)} p@3=${precision.toFixed(2)}  ${top3.map((r) => `${r.type}/${r.similarity.toFixed(2)}`).join(" ")}`,
        );

        if (!sectionOk) failures.push(`"${testCase.query}" → expected ${testCase.expectSection}, got ${winner ?? "nothing"}`);
        else if (!forbidOk) failures.push(`"${testCase.query}" → ${winner} must never take the top slot`);
        // Right section, wrong results inside it — two of the top three must
        // actually be about what was asked, or the section win is hollow.
        else if (precision < MIN_PRECISION_AT_3) {
          failures.push(`"${testCase.query}" → right section but p@3=${precision.toFixed(2)}, below ${MIN_PRECISION_AT_3}`);
        }
      }

      const passed = CASES.length - failures.length;
      // The table is the deliverable — read it, do not just check the exit code.
      console.log(`\n${rows.join("\n")}\n\n${passed}/${CASES.length} queries ranked correctly\n`);

      expect(failures, `\n${failures.join("\n")}\n`).toHaveLength(0);
    },
    // Twenty sequential embed-and-search round trips.
    180_000,
  );
});
