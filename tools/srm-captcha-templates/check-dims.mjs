import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(HERE, "samples");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f));
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  console.log(f, `${w}x${h}`, `${buf.length}b`);
}
