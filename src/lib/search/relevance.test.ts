import { describe, expect, it } from "vitest";

import {
  MIN_FACULTY_RELEVANCE,
  intentMultiplier,
  normaliseClicks,
  normaliseSimilarity,
  scoreResult,
} from "@/lib/search/relevance";

/**
 * These assert ranking *invariants*, not specific numbers. The weights in
 * relevance.ts are expected to be tuned — what must not change is which
 * result wins, so every test below states an ordering a reader would notice
 * on the page rather than a score.
 */
describe("intent damping", () => {
  it("puts faculty above a better-matching mentor when the query says 'faculty'", () => {
    // The exact regression from "machine learning faculty": a mentor whose bio
    // mentions AI/ML embedded slightly better than the ML professors, and the
    // old flat +60 mentor bonus vs +50 faculty bonus let it take the page.
    const faculty = scoreResult("faculty", { similarity: 0.638 }, "faculty");
    const mentor = scoreResult("mentor", { similarity: 0.66 }, "faculty");

    expect(faculty).toBeGreaterThan(mentor);
  });

  it("puts mentors above faculty when the query says 'mentor'", () => {
    const mentor = scoreResult("mentor", { similarity: 0.62 }, "mentors");
    const faculty = scoreResult("faculty", { similarity: 0.65 }, "mentors");

    expect(mentor).toBeGreaterThan(faculty);
  });

  it("is symmetric — neither person type is privileged by default", () => {
    const signals = { similarity: 0.6 };

    expect(scoreResult("faculty", signals, undefined)).toBe(
      scoreResult("mentor", signals, undefined),
    );
    expect(intentMultiplier("mentor", "faculty")).toBe(intentMultiplier("faculty", "mentors"));
  });

  it("demotes a policy document below a person when the query is about people", () => {
    // Documents used to carry a hardcoded +100, which is how Code of Conduct
    // sections reached the top of queries about finding a mentor.
    const doc = scoreResult("document", { similarity: 0.7 }, "mentors");
    const mentor = scoreResult("mentor", { similarity: 0.55 }, "mentors");

    expect(mentor).toBeGreaterThan(doc);
  });

  it("still lets documents win an actual policy question", () => {
    const doc = scoreResult("document", { similarity: 0.62 }, "documents");
    const mentor = scoreResult("mentor", { similarity: 0.62 }, "documents");

    expect(doc).toBeGreaterThan(mentor);
  });

  it("damps a demoted type uniformly, so its own ordering survives", () => {
    // Demotion must not scramble a category internally — a strong mentor still
    // outranks a weak one, it just cannot outrank the category that was asked for.
    const strong = scoreResult("mentor", { similarity: 0.7 }, "faculty");
    const weak = scoreResult("mentor", { similarity: 0.45 }, "faculty");

    expect(strong).toBeGreaterThan(weak);
    expect(weak).toBeGreaterThan(0);
  });

  it("penalises an unrelated type more than a sibling one", () => {
    expect(intentMultiplier("mentor", "faculty")).toBeGreaterThan(
      intentMultiplier("opportunity", "faculty"),
    );
  });
});

describe("evidence beats popularity", () => {
  it("cannot lift a topically empty result above a genuine match", () => {
    const popularButIrrelevant = scoreResult("mentor", { quality: 1 }, undefined);
    const unknownButRelevant = scoreResult("mentor", { similarity: 0.6 }, undefined);

    expect(unknownButRelevant).toBeGreaterThan(popularButIrrelevant);
  });

  it("ranks an exact name match above any semantic match", () => {
    const byName = scoreResult("faculty", { lexical: 1 }, undefined);
    const byTopic = scoreResult("faculty", { similarity: 0.75 }, undefined);

    expect(byName).toBeGreaterThan(byTopic);
  });
});

describe("signal normalisation", () => {
  it("spreads the similarity band search_knowledge actually returns", () => {
    // Raw cosine here lives in ~0.35–0.75; without rescaling, the gap between
    // a perfect match and a barely-passing one is a few points of 100.
    expect(normaliseSimilarity(0.35)).toBe(0);
    expect(normaliseSimilarity(0.75)).toBe(1);
    expect(normaliseSimilarity(0.55)).toBeCloseTo(0.5, 5);
  });

  it("clamps out-of-band values rather than producing negatives", () => {
    expect(normaliseSimilarity(0.1)).toBe(0);
    expect(normaliseSimilarity(0.99)).toBe(1);
    expect(normaliseSimilarity(undefined)).toBe(0);
  });

  it("saturates click counts so a viral result cannot dominate forever", () => {
    expect(normaliseClicks(0)).toBe(0);
    expect(normaliseClicks(5)).toBeLessThan(normaliseClicks(50));
    expect(normaliseClicks(100_000)).toBe(1);
  });

  it("keeps every score inside the 0–100 scale the sections compare on", () => {
    const best = scoreResult("faculty", { lexical: 1, similarity: 1, quality: 1 }, "faculty");
    const worst = scoreResult("post", {}, "faculty");

    expect(best).toBeLessThanOrEqual(100);
    expect(worst).toBe(0);
  });
});

describe("faculty floor", () => {
  it("admits a real topical match and rejects a barely-passing one", () => {
    // Faculty are indexed exhaustively, so a broad query pulls back professors
    // whose only connection is having an embedding at all.
    const real = scoreResult("faculty", { similarity: 0.62 }, undefined);
    const noise = scoreResult("faculty", { similarity: 0.4 }, undefined);

    expect(real).toBeGreaterThan(MIN_FACULTY_RELEVANCE);
    expect(noise).toBeLessThan(MIN_FACULTY_RELEVANCE);
  });
});
