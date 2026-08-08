import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "./png.mjs";
import { segmentCharacters } from "./segment.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(HERE, "samples");
const manifest = JSON.parse(fs.readFileSync(path.join(SAMPLES_DIR, "manifest.json"), "utf8"));

let matches = 0;
for (const entry of manifest) {
  if (!entry.label) continue;
  const buf = fs.readFileSync(path.join(SAMPLES_DIR, entry.filename));
  const img = decodePng(buf);
  const boxes = segmentCharacters(img);
  const ok = boxes.length === entry.label.length;
  if (ok) matches += 1;
  console.log(
    `${entry.label.padEnd(6)} -> ${boxes.length} segments ${ok ? "OK" : "MISMATCH"}  widths=[${boxes.map((b) => b.x1 - b.x0).join(",")}]`,
  );
}
console.log(`\n${matches}/${manifest.filter((m) => m.label).length} samples segmented to the expected character count`);
