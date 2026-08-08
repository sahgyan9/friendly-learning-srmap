// Leave-one-out validation: for each labelled sample, build templates from
// every OTHER sample and see if recognizeCaptcha() gets it right. With only
// 8 samples this is a rough/optimistic signal (many characters will have
// zero prior examples when held out), not a real accuracy number -- it's
// here to prove the mechanism works before spending days harvesting more.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "./png.mjs";
import { segmentCharacters } from "./segment.mjs";
import { normalizeGlyph } from "./normalize.mjs";
import { recognizeCaptcha } from "./recognize.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(HERE, "samples");
const manifest = JSON.parse(fs.readFileSync(path.join(SAMPLES_DIR, "manifest.json"), "utf8")).filter((m) => m.label);

let correctChars = 0;
let totalChars = 0;
let exactMatches = 0;

for (const held of manifest) {
  const templates = {};
  for (const entry of manifest) {
    if (entry.filename === held.filename) continue;
    const buf = fs.readFileSync(path.join(SAMPLES_DIR, entry.filename));
    const img = decodePng(buf);
    const boxes = segmentCharacters(img);
    if (boxes.length !== entry.label.length) continue;
    entry.label.split("").forEach((char, i) => {
      const grid = Array.from(normalizeGlyph(img, boxes[i]));
      (templates[char] ??= []).push(grid);
    });
  }

  const buf = fs.readFileSync(path.join(SAMPLES_DIR, held.filename));
  const { guess, confidence } = recognizeCaptcha(buf, templates);
  const ok = guess === held.label;
  if (ok) exactMatches += 1;

  const len = Math.max(guess.length, held.label.length);
  for (let i = 0; i < len; i++) {
    totalChars += 1;
    if (guess[i] === held.label[i]) correctChars += 1;
  }

  console.log(
    `${held.label.padEnd(6)} -> guess ${guess.padEnd(6)} conf=${confidence.toFixed(2)} ${ok ? "EXACT" : ""}`,
  );
}

console.log(`\n${exactMatches}/${manifest.length} exact matches, ${correctChars}/${totalChars} characters correct`);
console.log("(Expect this to look weak with only 8 samples -- most held-out characters have zero remaining");
console.log(" training examples once one sample is removed. The number to watch is characters correct, and");
console.log(" it should climb fast as more labelled samples get added.)");
