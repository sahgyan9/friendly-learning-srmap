import { describe, expect, it } from "vitest";

import {
  correctTypo,
  isQualifierToken,
  matchesWordBoundary,
  parseQuery,
} from "@/lib/search/query-engine";

/**
 * Query understanding, pinned to the failures that shipped.
 *
 * The eval in search-relevance.eval.test.ts is the end-to-end net, but it hits
 * production and spends embedding quota, so it only runs on demand. These are
 * pure and free, and they cover the layer that decides *what gets embedded* —
 * which is where every failure below actually happened. Retrieval cannot
 * recover a row it was never asked for.
 */

/** The query that produced 23 faculty, 8 mentors and zero guidelines. */
const MIDTERMS = "when are midterms for btech cse 7th sem starting";

describe("programme and cohort qualifiers", () => {
  it("recognises programme, cohort and ordinal words", () => {
    expect(isQualifierToken("btech")).toBe(true);
    expect(isQualifierToken("sem")).toBe(true);
    expect(isQualifierToken("7th")).toBe(true);
    expect(isQualifierToken("12th")).toBe(true);
    expect(isQualifierToken("midterms")).toBe(false);
    expect(isQualifierToken("physics")).toBe(false);
  });

  it("keeps them out of the embedded text", () => {
    const parsed = parseQuery(MIDTERMS);

    expect(parsed.semanticQuery).not.toMatch(/btech/);
    expect(parsed.semanticQuery).not.toMatch(/7th/);
    expect(parsed.semanticQuery).not.toMatch(/\bsem\b/);
    // Still recorded — they say who is asking, and a later filter may want them.
    expect(parsed.qualifierTokens).toEqual(expect.arrayContaining(["btech", "7th", "sem"]));
    // The question itself survives.
    expect(parsed.semanticQuery).toMatch(/midterms/);
  });
});

describe("department expansion", () => {
  it("does not prepend the department name to a calendar question", () => {
    // "Computer Science and Engineering" is in every faculty chunk verbatim, so
    // prepending it aimed a midterm-dates question straight at the people.
    const parsed = parseQuery(MIDTERMS);

    expect(parsed.detectedDepartment).toBe("Computer Science and Engineering");
    expect(parsed.semanticQuery.toLowerCase()).not.toContain("computer science and engineering");
  });

  it("still prepends it when the reader is looking for a person", () => {
    const parsed = parseQuery("cse faculty for machine learning");

    expect(parsed.targetCategory).toBe("faculty");
    expect(parsed.semanticQuery.toLowerCase()).toContain("computer science and engineering");
  });
});

describe("temporal intent", () => {
  it("routes a date question at documents even with no policy noun in it", () => {
    expect(parseQuery("when do classes reopen").targetCategory).toBe("documents");
    expect(parseQuery("last date for fee payment").targetCategory).toBe("documents");
    expect(parseQuery(MIDTERMS).targetCategory).toBe("documents");
  });

  it("does not hijack a query that names a kind of person", () => {
    // "when" is temporal, but the reader asked for a professor.
    expect(parseQuery("when can i meet a professor").targetCategory).toBe("faculty");
    expect(parseQuery("when is my mentor free").targetCategory).toBe("mentors");
  });
});

describe("retrieval variants", () => {
  it("asks a short query only once", () => {
    expect(parseQuery("physics faculty").retrievalQueries).toHaveLength(1);
  });

  it("asks a long question several ways, distilled first", () => {
    const parsed = parseQuery(MIDTERMS);

    expect(parsed.retrievalQueries.length).toBeGreaterThan(1);
    expect(parsed.retrievalQueries.length).toBeLessThanOrEqual(3);
    expect(parsed.retrievalQueries[0]).toBe(parsed.semanticQuery);
    // One phrasing must speak the corpus's language rather than the reader's:
    // the academic calendar has no sentence reading "when are midterms".
    expect(parsed.retrievalQueries.some((q) => q.includes("academic calendar"))).toBe(true);
    // And one must be the reader's own words, for whatever distillation lost.
    expect(parsed.retrievalQueries).toContain(parsed.cleaned);
  });
});

describe("did you mean", () => {
  it("does not offer the singular of a word the reader spelled correctly", () => {
    // Shipped behaviour: searching "midterms" printed *Did you mean "midterm"?*
    expect(correctTypo("midterms")).toBeNull();
    expect(correctTypo("holidays")).toBeNull();
    expect(correctTypo("projects")).toBeNull();
    expect(parseQuery("when are midterms").suggestedQuery).toBeNull();
    expect(parseQuery(MIDTERMS).suggestedQuery).toBeNull();
  });

  it("leaves programme words alone", () => {
    expect(correctTypo("btech")).toBeNull();
    expect(correctTypo("sem")).toBeNull();
  });

  it("still corrects an actual misspelling", () => {
    expect(correctTypo("pyhton")).toBe("python");
    expect(correctTypo("machien")).toBe("machine");
  });
});

describe("word boundary matching", () => {
  it("matches a plural query token against singular corpus text", () => {
    // The calendar says "midterm examinations"; students type "midterms".
    expect(matchesWordBoundary("midterm examinations begin 28 september", "midterms")).toBe(true);
    // And the direction that already worked keeps working.
    expect(matchesWordBoundary("midterms begin 28 september", "midterm")).toBe(true);
  });

  it("still refuses a subword match", () => {
    expect(matchesWordBoundary("protocol design", "to")).toBe(false);
  });
});
