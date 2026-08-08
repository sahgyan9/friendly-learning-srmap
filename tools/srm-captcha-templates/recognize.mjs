// Nearest-neighbour glyph recognition against templates.json. This module is
// intentionally dependency-free and only uses Web-standard APIs (no Node
// built-ins beyond what's already needed to load the JSON) so it can be
// ported into the Deno edge function's recognizeCaptcha() stub later with
// minimal changes -- swap decodePng's zlib.inflateSync for Deno's
// DecompressionStream, everything else here is portable as-is.
import { decodePng } from "./png.mjs";
import { segmentCharacters } from "./segment.mjs";
import { normalizeGlyph, hammingDistance, GRID_W, GRID_H } from "./normalize.mjs";

/** @param {Record<string, number[][]>} templates */
export function recognizeCaptcha(imageBuffer, templates) {
  const img = decodePng(imageBuffer);
  const boxes = segmentCharacters(img);

  let guess = "";
  let totalConfidence = 0;
  const maxDistance = GRID_W * GRID_H;

  for (const box of boxes) {
    const grid = Array.from(normalizeGlyph(img, box));
    let bestChar = null;
    let bestDistance = Infinity;
    for (const [char, examples] of Object.entries(templates)) {
      for (const example of examples) {
        const d = hammingDistance(grid, example);
        if (d < bestDistance) {
          bestDistance = d;
          bestChar = char;
        }
      }
    }
    guess += bestChar ?? "?";
    totalConfidence += bestChar ? 1 - bestDistance / maxDistance : 0;
  }

  return {
    guess,
    confidence: boxes.length ? totalConfidence / boxes.length : 0,
  };
}
