/**
 * Utility functions for detecting and formatting emoji-only chat messages.
 */

/**
 * Checks if a string consists ONLY of emojis (and optional whitespace).
 */
export function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Strip all whitespace, ZWJs, variation selectors, keycaps, regional indicators, and pictographics
  const nonEmoji = trimmed
    .replace(/[\s\u200D\uFE0F\u20E3]/g, "")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\p{Emoji_Component}/gu, "");

  // If nothing is left, it's emoji-only!
  return nonEmoji.length === 0;
}

/**
 * Counts the number of top-level emojis in an emoji-only string.
 */
export function getEmojiCount(text: string): number {
  if (!isEmojiOnly(text)) return 0;
  const trimmed = text.trim();

  // If Intl.Segmenter is supported, count grapheme clusters (excluding pure whitespace graphemes)
  // @ts-expect-error Segmenter is not typed in the default lib
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    // @ts-expect-error Segmenter is not typed in the default lib
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" }) as {
      segment: (s: string) => Iterable<{ segment: string }>;
    };
    const segments = Array.from(segmenter.segment(trimmed)).filter(
      (s) => s.segment.trim().length > 0
    );
    return segments.length;
  }

  // Fallback: match Extended_Pictographic occurrences
  const matches = trimmed.match(/\p{Extended_Pictographic}/gu);
  return matches ? matches.length : 1;
}

/**
 * Returns Tailwind font size classes for emoji-only messages (WhatsApp style).
 */
export function getEmojiFontSizeClass(count: number): string {
  if (count === 1) return "text-4xl sm:text-5xl leading-normal select-none";
  if (count === 2) return "text-3xl sm:text-4xl leading-normal select-none";
  if (count === 3) return "text-2xl sm:text-3xl leading-normal select-none";
  return "text-xl sm:text-2xl leading-normal select-none";
}
