// Packs templates.json (arrays of 0/1 ints, 216 per glyph) into base64-encoded
// bitstrings -- roughly 20x smaller, and easy to embed directly as a single
// constant inside the edge function (this repo deploys one file per
// function; no relative-import/JSON-module-assertion complexity needed).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GRID_W, GRID_H } from "./normalize.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const templates = JSON.parse(fs.readFileSync(path.join(HERE, "templates.json"), "utf8"));

const bitsPerGlyph = GRID_W * GRID_H;
const bytesPerGlyph = Math.ceil(bitsPerGlyph / 8);

function packGrid(grid) {
  const bytes = new Uint8Array(bytesPerGlyph);
  for (let i = 0; i < grid.length; i++) {
    if (grid[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  return Buffer.from(bytes).toString("base64");
}

const packed = {};
for (const [char, examples] of Object.entries(templates)) {
  packed[char] = examples.map(packGrid);
}

fs.writeFileSync(path.join(HERE, "templates.packed.json"), JSON.stringify(packed));
console.log(`Packed ${Object.values(templates).flat().length} examples across ${Object.keys(templates).length} characters.`);
console.log(`${fs.statSync(path.join(HERE, "templates.json")).size}b -> ${fs.statSync(path.join(HERE, "templates.packed.json")).size}b`);
