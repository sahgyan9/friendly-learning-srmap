// Fetches a small batch of fresh captcha images from the SRM portal's public
// /captchas endpoint and saves them for manual labelling.
//
// SAFE BY DESIGN: this only ever does a GET against a public, unauthenticated
// image endpoint (the same request your browser makes just by loading the
// login page) -- it never submits a login attempt, so it carries none of the
// "wrong-password-lockout" risk the actual import flow has to guard against.
// Still worth spacing out (see DELAY_MS) rather than hammering it.
//
// Usage: node fetch-batch.mjs [count]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(HERE, "samples");
const MANIFEST_PATH = path.join(SAMPLES_DIR, "manifest.json");
const BASE = "https://student.srmap.edu.in/srmapstudentcorner";
const DELAY_MS = 1500;
const COUNT = Number(process.argv[2] ?? 10);

fs.mkdirSync(SAMPLES_DIR, { recursive: true });

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}
function saveManifest(entries) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = loadManifest();
let fetched = 0;

for (let i = 0; i < COUNT; i++) {
  const res = await fetch(`${BASE}/captchas`, { redirect: "manual" });
  if (!res.ok) {
    console.error(`fetch ${i + 1}/${COUNT} failed: HTTP ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const filename = `${Date.now()}-${i}.png`;
  fs.writeFileSync(path.join(SAMPLES_DIR, filename), buf);
  manifest.push({ filename, label: null });
  fetched += 1;
  console.log(`[${fetched}/${COUNT}] saved ${filename} (${buf.length} bytes)`);
  if (i < COUNT - 1) await sleep(DELAY_MS);
}

saveManifest(manifest);
const unlabelled = manifest.filter((m) => m.label === null).length;
console.log(`\nDone. ${manifest.length} total samples, ${unlabelled} awaiting a label.`);
console.log(`Next: view the new files in ${SAMPLES_DIR} and fill in their labels`);
console.log(`in manifest.json, or via: node label.mjs <filename> <LABEL>`);
