import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(HERE, "samples", "1786185784214-0.png");
const buf = fs.readFileSync(file);
console.log("width", buf.readUInt32BE(16));
console.log("height", buf.readUInt32BE(20));
console.log("bit depth", buf.readUInt8(24));
console.log("color type", buf.readUInt8(25)); // 0=gray 2=RGB 3=palette 4=gray+alpha 6=RGBA
console.log("compression", buf.readUInt8(26));
console.log("filter method", buf.readUInt8(27));
console.log("interlace", buf.readUInt8(28));
