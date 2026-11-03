import { describe, it, expect } from "vitest";
import { detectDistressText, findDistressMatch, DISTRESS_KEYWORDS } from "./distress-keywords";

describe("distress-keywords", () => {
  it("detects direct English crisis phrases", () => {
    expect(detectDistressText("I feel like I want to die right now")).toBe(true);
    expect(findDistressMatch("I feel like I want to die right now")).toBe("want to die");
  });

  it("detects transliterated Hindi crisis expressions", () => {
    expect(detectDistressText("main mar jana chahta hu sab khatam ho gaya")).toBe(true);
    expect(findDistressMatch("main mar jana chahta hu sab khatam ho gaya")).toBe("mar jana chahta");
  });

  it("detects transliterated Telugu crisis expressions", () => {
    expect(detectDistressText("naku chavali anipistundi emit cheyalo telidu")).toBe(true);
    expect(findDistressMatch("naku chavali anipistundi emit cheyalo telidu")).toBe("chavali anipistundi");
  });

  it("does not false-trigger on ordinary student posts", () => {
    const regularPost = "Looking for a study partner for DSA tree algorithms and dynamic programming.";
    expect(detectDistressText(regularPost)).toBe(false);
    expect(findDistressMatch(regularPost)).toBeNull();
  });

  it("handles case-insensitivity and punctuation gracefully", () => {
    expect(detectDistressText("I Cannot Take This Anymore!!!")).toBe(true);
    expect(findDistressMatch("I Cannot Take This Anymore!!!")).toBe("cannot take this anymore");
  });

  it("contains curated distress keywords across English, Hindi, and Telugu", () => {
    expect(DISTRESS_KEYWORDS.length).toBeGreaterThan(15);
  });
});
