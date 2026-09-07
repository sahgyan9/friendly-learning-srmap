// Builds public/downloads/Oberleaf-Setup.zip from the loose files in
// public/downloads.
//
// Why a zip exists at all: Chrome and Edge treat a bare `.bat` download as a
// dangerous file type and block or hard-warn on it, and Defender's heuristics
// score a downloaded batch file that fetches and runs a remote PowerShell
// script very highly. A zip downloads cleanly, and once extracted the .bat
// finds install.ps1 sitting next to it and never touches the network — which
// removes the download-and-execute pattern entirely.
//
// Written against Node's zlib with no third-party dependency, because this
// runs inside the Vercel build and a transitive package that happens to be
// hoisted locally is not something to bet the release on.

import { deflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const downloads = path.join(here, "..", "public", "downloads");

const README = `Oberleaf
========

1. Extract this whole zip into a folder (right-click > Extract All).
   Keep Oberleaf-Setup.bat and install.ps1 together.
2. Double-click Oberleaf-Setup.bat.
3. If Windows shows "Windows protected your PC", click "More info" and then
   "Run anyway". This appears because the script is not code-signed, not
   because anything is wrong with it.
4. If Windows asks for permission to install software, choose Yes.

The setup window stays open until you close it. If something fails it prints
the reason and the path to a log file - send that log when reporting a problem.

Source code: https://github.com/sahgyan9/Oberleaf
`;

// Windows PowerShell 5.1 - the version on every student's Windows 10/11 box -
// decodes a .ps1 without a byte order mark as Windows-1252. An em dash then
// becomes three characters, one of which is a double quote, and that stray
// quote turns the remainder of the file into one string literal. The shipped
// installer had em dashes in its banner and did exactly this: five parse
// errors, nothing installed, window gone. Fail the build rather than ship it
// again.
function assertRunnableOnWindows(name, data) {
  const hasBom = data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
  const body = hasBom ? data.subarray(3) : data;
  const badAt = body.findIndex((b) => b > 0x7f);

  if (name.endsWith(".ps1") && !hasBom) {
    throw new Error(`${name} is missing its UTF-8 BOM; PowerShell 5.1 will misread it.`);
  }
  if (badAt !== -1) {
    const line = body.subarray(0, badAt).toString("utf8").split("\n").length;
    throw new Error(
      `${name} has a non-ASCII byte on line ${line}. Replace it with plain ASCII ` +
        `(an em dash or curly quote here breaks setup on Windows).`
    );
  }
}

const entries = [
  { name: "Oberleaf-Setup.bat", data: readFileSync(path.join(downloads, "Oberleaf-Setup.bat")) },
  { name: "install.ps1", data: readFileSync(path.join(downloads, "install.ps1")) },
  { name: "README.txt", data: Buffer.from(README, "utf8") },
];

for (const entry of entries) {
  if (entry.name !== "README.txt") assertRunnableOnWindows(entry.name, entry.data);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}

// A fixed timestamp keeps the zip byte-identical between builds, so a rebuild
// with unchanged scripts does not show up as a diff.
const DOS_TIME = 0;
const DOS_DATE = 0x2821; // 2020-01-01

const local = [];
const central = [];
let offset = 0;

for (const entry of entries) {
  const name = Buffer.from(entry.name, "utf8");
  const compressed = deflateRawSync(entry.data, { level: 9 });
  const crc = crc32(entry.data);

  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // flags
  header.writeUInt16LE(8, 8); // deflate
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(entry.data.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28); // extra length

  local.push(header, name, compressed);

  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(20, 4); // version made by
  dir.writeUInt16LE(20, 6); // version needed
  dir.writeUInt16LE(0, 8); // flags
  dir.writeUInt16LE(8, 10); // deflate
  dir.writeUInt16LE(DOS_TIME, 12);
  dir.writeUInt16LE(DOS_DATE, 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(compressed.length, 20);
  dir.writeUInt32LE(entry.data.length, 24);
  dir.writeUInt16LE(name.length, 28);
  dir.writeUInt16LE(0, 30); // extra
  dir.writeUInt16LE(0, 32); // comment
  dir.writeUInt16LE(0, 34); // disk
  dir.writeUInt16LE(0, 36); // internal attrs
  dir.writeUInt32LE(0, 38); // external attrs
  dir.writeUInt32LE(offset, 42);

  central.push(dir, name);
  offset += header.length + name.length + compressed.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const out = path.join(downloads, "Oberleaf-Setup.zip");
writeFileSync(out, Buffer.concat([...local, centralBuf, end]));
console.log(`[oberleaf] wrote ${path.relative(path.join(here, ".."), out)} (${entries.length} files)`);
