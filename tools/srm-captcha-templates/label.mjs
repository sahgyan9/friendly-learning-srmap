// Records the human-read label for one sample. Usage: node label.mjs <filename> <LABEL>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.join(HERE, "samples", "manifest.json");

const [filename, label] = process.argv.slice(2);
if (!filename || !label) {
  console.error("Usage: node label.mjs <filename> <LABEL>");
  process.exit(1);
}
if (!/^[A-Z0-9]{3,6}$/.test(label)) {
  console.error(`"${label}" doesn't look like a captcha label (expected 3-6 uppercase letters/digits)`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const entry = manifest.find((m) => m.filename === filename);
if (!entry) {
  console.error(`${filename} not found in manifest.json`);
  process.exit(1);
}
entry.label = label;
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`${filename} -> ${label}`);
