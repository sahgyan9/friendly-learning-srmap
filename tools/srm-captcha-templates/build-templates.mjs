// Builds templates.json from every labelled sample: segment each image into
// glyphs, zip glyph count against the label (skip on mismatch -- a cheap
// consistency check against a bad label or a segmentation edge case), and
// store every normalised glyph bitmap grouped by character. Matching later is
// nearest-neighbour against ALL stored examples per character, not a single
// averaged template -- this font is thin enough that a few outlier samples
// would otherwise blur an averaged template into mush.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "./png.mjs";
import { segmentCharacters } from "./segment.mjs";
import { normalizeGlyph } from "./normalize.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(HERE, "samples");
const OUT_PATH = path.join(HERE, "templates.json");

const manifest = JSON.parse(fs.readFileSync(path.join(SAMPLES_DIR, "manifest.json"), "utf8"));

/** @type {Record<string, number[][]>} */
const templates = {};
let used = 0;
let skipped = 0;

for (const entry of manifest) {
  if (!entry.label) continue;
  const buf = fs.readFileSync(path.join(SAMPLES_DIR, entry.filename));
  const img = decodePng(buf);
  const boxes = segmentCharacters(img);

  if (boxes.length !== entry.label.length) {
    console.warn(`skip ${entry.filename} (${entry.label}): ${boxes.length} segments, expected ${entry.label.length}`);
    skipped += 1;
    continue;
  }

  entry.label.split("").forEach((char, i) => {
    const grid = normalizeGlyph(img, boxes[i]);
    (templates[char] ??= []).push(Array.from(grid));
  });
  used += 1;
}

fs.writeFileSync(OUT_PATH, JSON.stringify(templates));

const charCounts = Object.entries(templates)
  .map(([c, examples]) => `${c}:${examples.length}`)
  .sort()
  .join(" ");
console.log(`\nBuilt templates.json from ${used} samples (${skipped} skipped).`);
console.log(`${Object.keys(templates).length}/36 characters have at least one example.`);
console.log(charCounts);
