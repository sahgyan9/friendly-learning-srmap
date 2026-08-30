// Shared plumbing for talking to the SRM AP student portal
// (student.srmap.edu.in — a third-party site we do not run and have no
// special access to), used by both the human-supervised import-srm-portal
// function and the unattended sync-srm-portal cron function.
//
// Deliberately NOT shared (kept per-function, see each file): the
// captcha-fetch endpoint (only the human-facing function shows a captcha to
// someone), rate-limit bookkeeping (different tables/windows), auth checks,
// and all encryption/decryption of the DOB. Merging those would blur the
// human-supervised/unattended distinction the whole feature's risk model
// rests on.
//
// HARD RULE, inherited by every caller: a portal password (DOB) must never be
// logged, thrown in an Error, or written anywhere outside srm_portal_credentials'
// ciphertext column. The portal's failure page does not echo submitted values
// back (verified), but treat that as defense in depth, not a license to log
// the response body anyway.

export const PORTAL_BASE = "https://student.srmap.edu.in/srmapstudentcorner";
export const COLLEGE_ID_FORMAT = /^AP[0-9]{11}$/;

// --- cookie jar -------------------------------------------------------------
// The jar only ever holds the portal's pre-auth JSESSIONID (issued freely to
// any anonymous visitor of the login page) and, after a successful login, its
// now-authenticated counterpart. Neither is a secret of ours or the student's,
// so round-tripping it through the browser as an opaque base64 blob between
// the two calls is fine — simpler than standing up server-side session
// storage (a KV store, a scratch table with a TTL sweep) for a value that is
// itself short-lived and single-use regardless.
export type Jar = Record<string, string>;

export function mergeSetCookies(jar: Jar, res: Response): Jar {
  const setCookies = res.headers.getSetCookie?.() ??
    (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
  const next = { ...jar };
  for (const line of setCookies) {
    const pair = line.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    next[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return next;
}

export function cookieHeader(jar: Jar): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

export function encodeSessionToken(jar: Jar): string {
  return btoa(JSON.stringify(jar));
}

export function decodeSessionToken(token: string): Jar {
  return JSON.parse(atob(token));
}

// =============================================================================
// Captcha OCR (advisory only when used by a human-facing caller — the student
// always sees the real captcha image and confirms or corrects it before it is
// submitted. The unattended caller, sync-srm-portal, uses the guess directly
// as an accepted risk — see that function's header comment).
//
// Trained offline against real captchas harvested via tools/srm-captcha-
// templates/ (fetch-batch.mjs + manual labelling + build-templates.mjs), which
// also documents two things worth knowing before touching this: captchas are
// NOT always 5 characters (observed a genuine 4-character one), and some
// letter/digit pairs render with zero gap between them (Y+8, X+4, A+8, and a
// triple-merge in "P4644") — hence the column-projection segmentation with
// recursive valley-splitting below, not a fixed 5-cell crop.
//
// PACKED_TEMPLATES is a base64-packed export of that offline training run
// (114 examples across 26/36 characters as of this writing — coverage grows
// as tools/srm-captcha-templates/fetch-batch.mjs collects more and this gets
// regenerated).
// =============================================================================

const GRID_W = 12;
const GRID_H = 18;
const BITS_PER_GLYPH = GRID_W * GRID_H;

// deno-fmt-ignore
const PACKED_TEMPLATES: Record<string, string[]> = {"0":["8AN/+M/zHO7hDuzADuzADuzAHs7hPI//8Ac/","8IN//O/zHv7hD/zAD/zAD/zAH+7hPs//+Ac/","8IN//O/zHv7hD/zAD/zAD/zAH+7hPs//+Ac/","8IN//O/zHv7hD/zAD/zAD/zAH+7hPs//+Ac/"],"1":["/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////","/PEf//Ee4AEe4AEe4AEe4AEe4AEe4PH/////"],"2":["/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////","/vN////4AQ/gAA7wAA/84A9/+MMPf/D/////"],"3":["/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/","/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/","/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/","/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/","/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/","/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/","/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/","/Of//u/wAA7AAAzw+I//+A/wAAzAB////+9/"],"4":["wAd+8Ad/cIdzOMdxDvdwD/f/////AAdwAAdw","wAM+8AM/uIM7uMM5jnM4h/P/////gAM4gAM4","wAM+8AM/uIM7uMM5jnM4h/P/////gAM4gAM4","wAd+8Ad/cIdzOMdxDvdwD/f/////AAdwAAdw","wAM+8AM/uIM7uMM5jnM4h/P/////gAM4gAM4","wAM+8AM/uIM7uMM5jnM4h/P/////gAM4gAM4","wAd84Ad+cIdzOIdzHOdwDuf//u//AAdwAAdw","wAd+8Ad/cIdzOMdxDvdwD/f/////AAdwAAdw","wAd+8Ad/cIdzOMdxDvdwD/f/////AAdwAAdw"],"5":["/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/","/u///u8BHuB//u//Dg/gAAzAAAzgB////+8/"],"6":["4I///O+DHvAB7/f////zH/7AD+zhPs//+A8/","4I///O+DHvAB7/f////zH/7AD+zhPs//+A8/","4I///O+DHvAB7/f////zH/7AD+zhPs//+A8/","4A//+M+HHOAB7uf//u/zHu7ADszhPI//8A8/","4I///O+DHvAB7/f////zH/7AD+zhPs//+A8/","4I///O+DHvAB7/f////zH/7AD+zhPs//+A8/","4A//+M+HHOAB7uf//u/zHu7ADszhPI//8A8/","4I///O+DHvAB7/f////zH/7AD+zhPs//+A8/","4I///O+DHvAB7/f////zH/7AD+zhPs//+A8/"],"7":["/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH","/////w/gAA/wAA/4gAd8wAc+4AMf8IEP+MAH"],"8":["8Mf//u/zDuzAPs//+M//Pu/ADuzAPs///A9/","+Of////zD/zAP+///O//P//AD/zAP+///o9/","8Mf//u/zDuzAPs//+M//Pu/ADuzAPs///A9/","+Of////zD/zAP+///O//P//AD/zAP+///o9/","+Of////zD/zAP+///O//P//AD/zAP+///o9/","+Of////zD/zAP+///O//P//AD/zAP+///o9/","+Of////zD/zAP+///O//P//AD/zAP+///o9/","+Of////zD/zAP+///O//P//AD/zAP+///o9/"],"9":["8MN//v/zH/7AD/zhP+///I/fAA7ghu///scf","8MN//v/zH/7AD/zhP+///I/fAA7ghu///scf","8MN//v/zH/7AD/zhP+///I/fAA7ghu///scf","8MN//v/zH/7AD/zhP+///I/fAA7ghu///scf","8MN//v/zH/7AD/zhP+///I/fAA7ghu///scf","8MN//v/zH/7AD/zhP+///I/fAA7ghu///scf"],"Y":["D+7wHs9xvMM/+AMf8AEP4AAO4AAO4AAO4AAO","D+zhHs/xOId/+AM/8AMe4AAO4AAO4AAO4AAO"],"J":["gA/4gA/4gA/4gA/4gA/4gA/4gA/4gA////9/","gA/4gA/4gA/4gA/4gA/4gA/4gA/4gA////9/"],"M":["D/7gH/7hH/7zN3u7t3mf53me53mMB3iAB3iA"],"X":["D+zhHM/zOIc/+AM/4AE/8IM/+IdzHO/xHv7A","D+zhHM/zOIc/+AM/4AE/8IM/+IdzHO/xHv7A"],"Z":["/////w/wAA/4wAc+4AEP8IAPfOADH/D/////"],"A":["8AEf8AEf8IE7uIM7vMd7HMd//Of/Du7gD/7g"],"T":["/////w8O4AAO4AAO4AAO4AAO4AAO4AAO4AAO","/////w8O4AAO4AAO4AAO4AAO4AAO4AAO4AAO"],"L":["D/AAD/AAD/AAD/AAD/AAD/AAD/AAD/D/////","D/AAD/AAD/AAD/AAD/AAD/AAD/AAD/D/////"],"H":["D/zAD/zAD/zAD/z/////D/zAD/zAD/zAD/zA"],"R":["//F////wD//wD//w//c///d8D//wD//wD/7g"],"S":["+O///v/hD/AAH/A//s//8A/wABzAD/7//+9/"],"B":["//P////wD/7gD///////D//AD/zAD/////9/","//P////wD/7gD///////D//AD/zAD/////9/"],"Q":["8MN//O/zDv7AB3zAB/zAD+zgPs//8AN4AAfw"],"P":["//f////wD/7AD/zgD/////9/D/AAD/AAD/AA"],"N":["D/zBH/zDP/zH//zP7/zOz/3cj//4D//wD//g","D/zBH/zDP/zH//zP7/zOz/3cj//4D//wD//g"],"F":["//////8AD/AAD/D/////D/AAD/AAD/AAD/AA"]};

function unpackGrid(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const grid = new Uint8Array(BITS_PER_GLYPH);
  for (let i = 0; i < BITS_PER_GLYPH; i++) {
    grid[i] = (bytes[i >> 3] >> (i & 7)) & 1;
  }
  return grid;
}

const TEMPLATES: Record<string, Uint8Array[]> = Object.fromEntries(
  Object.entries(PACKED_TEMPLATES).map(([char, examples]) => [char, examples.map(unpackGrid)]),
);

// --- PNG decode (Deno-compatible: Web Compression Streams instead of Node's zlib) ---
interface DecodedImage {
  width: number;
  height: number;
  pixels: Uint8Array; // always normalised to RGB, 3 bytes/pixel
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

async function decodePng(buf: Uint8Array): Promise<DecodedImage> {
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (buf[i] !== SIGNATURE[i]) throw new Error("Not a PNG");

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks: Uint8Array[] = [];

  while (offset < buf.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(buf[offset + 4], buf[offset + 5], buf[offset + 6], buf[offset + 7]);
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      bitDepth = buf[offset + 16];
      colorType = buf[offset + 17];
      if (buf[offset + 20] !== 0) throw new Error("Interlaced PNG not supported");
    } else if (type === "IDAT") {
      idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
    } else if (type === "IEND") {
      break;
    }
    offset += 8 + length + 4;
  }

  if (bitDepth !== 8) throw new Error(`Only 8-bit PNG supported, got bit depth ${bitDepth}`);
  const channelsByColorType: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByColorType[colorType];
  if (!channels) throw new Error(`Unsupported color type ${colorType}`);

  let totalLen = 0;
  for (const c of idatChunks) totalLen += c.length;
  const concatenated = new Uint8Array(totalLen);
  let p = 0;
  for (const c of idatChunks) { concatenated.set(c, p); p += c.length; }

  // PNG's IDAT is a standard zlib stream (RFC 1950), which is what the Web
  // Compression Streams API calls "deflate" (as opposed to "deflate-raw").
  const stream = new Blob([concatenated]).stream().pipeThrough(new DecompressionStream("deflate"));
  const raw = new Uint8Array(await new Response(stream).arrayBuffer());

  const stride = width * channels;
  const pixels = new Uint8Array(width * height * 3);
  let prevRow = new Uint8Array(stride);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    const filterType = raw[pos];
    pos += 1;
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const raw8 = raw[pos + x];
      const a = x >= channels ? row[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      let value: number;
      switch (filterType) {
        case 0: value = raw8; break;
        case 1: value = raw8 + a; break;
        case 2: value = raw8 + b; break;
        case 3: value = raw8 + Math.floor((a + b) / 2); break;
        case 4: value = raw8 + paeth(a, b, c); break;
        default: throw new Error(`Unknown filter type ${filterType}`);
      }
      row[x] = value & 0xff;
    }
    pos += stride;

    for (let x = 0; x < width; x++) {
      const si = x * channels;
      const di = (y * width + x) * 3;
      if (channels === 1 || channels === 2) {
        pixels[di] = pixels[di + 1] = pixels[di + 2] = row[si];
      } else {
        pixels[di] = row[si];
        pixels[di + 1] = row[si + 1];
        pixels[di + 2] = row[si + 2];
      }
    }
    prevRow = row;
  }

  return { width, height, pixels };
}

// --- segmentation (column-projection, with recursive valley-splitting for merged glyphs) ---
interface Box { x0: number; x1: number }

const INK_THRESHOLD = 200;
const MIN_GAP = 2;
const MIN_GLYPH_WIDTH = 3;
const WIDE_BOX_WIDTH = 22; // confirmed single glyphs run ~7-19px; merges start at ~30px+

function inkDensity(img: DecodedImage, x: number): number {
  let count = 0;
  for (let y = 0; y < img.height; y++) {
    const i = (y * img.width + x) * 3;
    const brightness = (img.pixels[i] + img.pixels[i + 1] + img.pixels[i + 2]) / 3;
    if (brightness < INK_THRESHOLD) count += 1;
  }
  return count;
}

function splitAtValley(box: Box, density: number[]): Box[] {
  const margin = Math.max(2, Math.floor((box.x1 - box.x0) * 0.25));
  let valleyX = -1;
  let valleyDensity = Infinity;
  for (let x = box.x0 + margin; x < box.x1 - margin; x++) {
    if (density[x] < valleyDensity) {
      valleyDensity = density[x];
      valleyX = x;
    }
  }
  const peakDensity = Math.max(...density.slice(box.x0, box.x1));
  if (valleyX === -1 || peakDensity === 0 || valleyDensity / peakDensity > 0.6) return [box];
  const left = { x0: box.x0, x1: valleyX };
  const right = { x0: valleyX, x1: box.x1 };
  if (left.x1 - left.x0 < MIN_GLYPH_WIDTH || right.x1 - right.x0 < MIN_GLYPH_WIDTH) return [box];
  return [left, right];
}

function segmentCharacters(img: DecodedImage): Box[] {
  const density: number[] = new Array(img.width);
  for (let x = 0; x < img.width; x++) density[x] = inkDensity(img, x);

  let boxes: Box[] = [];
  let start: number | null = null;
  let gap = 0;
  for (let x = 0; x < img.width; x++) {
    if (density[x] > 0) {
      if (start === null) start = x;
      gap = 0;
    } else if (start !== null) {
      gap += 1;
      if (gap >= MIN_GAP) {
        const end = x - gap;
        if (end - start >= MIN_GLYPH_WIDTH) boxes.push({ x0: start, x1: end });
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) {
    const end = img.width - gap;
    if (end - start >= MIN_GLYPH_WIDTH) boxes.push({ x0: start, x1: end });
  }

  let stable = false;
  while (!stable) {
    stable = true;
    const next: Box[] = [];
    for (const b of boxes) {
      if (b.x1 - b.x0 > WIDE_BOX_WIDTH) {
        const split = splitAtValley(b, density);
        if (split.length > 1) stable = false;
        next.push(...split);
      } else {
        next.push(b);
      }
    }
    boxes = next;
  }

  return boxes;
}

// --- glyph normalisation + nearest-neighbour matching ---
function isInk(img: DecodedImage, x: number, y: number): boolean {
  const i = (y * img.width + x) * 3;
  return (img.pixels[i] + img.pixels[i + 1] + img.pixels[i + 2]) / 3 < INK_THRESHOLD;
}

function normalizeGlyph(img: DecodedImage, box: Box): Uint8Array {
  let y0 = img.height;
  let y1 = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      if (isInk(img, x, y)) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (y1 < y0) { y0 = 0; y1 = img.height - 1; }

  const srcW = box.x1 - box.x0;
  const srcH = y1 - y0 + 1;
  const grid = new Uint8Array(GRID_W * GRID_H);
  for (let gy = 0; gy < GRID_H; gy++) {
    const sy = y0 + Math.floor((gy / GRID_H) * srcH);
    for (let gx = 0; gx < GRID_W; gx++) {
      const sx = box.x0 + Math.floor((gx / GRID_W) * srcW);
      grid[gy * GRID_W + gx] = isInk(img, sx, sy) ? 1 : 0;
    }
  }
  return grid;
}

function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d += 1;
  return d;
}

export async function recognizeCaptcha(imageBytes: Uint8Array): Promise<{ guess: string | null; confidence: number }> {
  try {
    const img = await decodePng(imageBytes);
    const boxes = segmentCharacters(img);
    if (!boxes.length) return { guess: null, confidence: 0 };

    let guess = "";
    let totalConfidence = 0;
    for (const box of boxes) {
      const grid = normalizeGlyph(img, box);
      let bestChar: string | null = null;
      let bestDistance = Infinity;
      for (const [char, examples] of Object.entries(TEMPLATES)) {
        for (const example of examples) {
          const d = hammingDistance(grid, example);
          if (d < bestDistance) {
            bestDistance = d;
            bestChar = char;
          }
        }
      }
      guess += bestChar ?? "?";
      totalConfidence += bestChar ? 1 - bestDistance / BITS_PER_GLYPH : 0;
    }
    return { guess, confidence: totalConfidence / boxes.length };
  } catch (error) {
    // Never let an OCR bug break the flow — a human-facing caller falls back
    // to manual entry; the unattended caller just skips this mentor for the
    // run (see sync-srm-portal).
    console.error("captcha OCR failed (non-fatal):", error instanceof Error ? error.message : error);
    return { guess: null, confidence: 0 };
  }
}

// --- portal HTML parsing ----------------------------------------------------
// Plain string/regex extraction, not a DOM parser: the portal's markup is
// simple (regular <table>/<tr>/<td>, no attributes worth reading) and case-
// inconsistent (ids=6 uses uppercase <TR>/<TD>), which a regex handles as
// easily as a DOM query would, without adding a parser dependency to a Deno
// edge function for what is fundamentally "read some table cells".
export function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ProfileFields {
  program: string | null;
  currentSemester: number | null;
  // Best-effort — the exact portal field name is unconfirmed, so this is a
  // tolerant case-insensitive lookup across a few candidate keys. Cheap to
  // leave permanently even after the real key is confirmed against a live
  // account, since it costs nothing to keep checking the others too.
  mobileNumber: string | null;
}

const MOBILE_KEYS = ["Mobile", "Mobile No", "Mobile Number", "Contact No", "Phone", "Phone No"];

function extractMobile(fields: Record<string, string>): string | null {
  for (const key of Object.keys(fields)) {
    if (MOBILE_KEYS.some((candidate) => key.trim().toLowerCase() === candidate.toLowerCase())) {
      return fields[key] || null;
    }
  }
  return null;
}

export function parseProfile(html: string): ProfileFields {
  const rows = [...html.matchAll(
    /<tr>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>\s*:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi,
  )];
  const fields: Record<string, string> = {};
  for (const m of rows) fields[stripTags(m[1])] = stripTags(m[2]);

  const semesterText = fields["Semester"] ?? "";
  const romanMatch = semesterText.match(/^([IVX]+)\s*SEMESTER/i);
  const romanToInt: Record<string, number> = {
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  };
  const currentSemester = romanMatch ? romanToInt[romanMatch[1].toUpperCase()] ?? null : null;

  return {
    program: fields["Program / Section"]?.split("/")[0]?.trim() || null,
    currentSemester,
    mobileNumber: extractMobile(fields),
  };
}

export interface TranscriptSubject {
  semester: number;
  code: string;
  name: string;
  credit: number | null;
}

export function parseTranscript(html: string): { cgpa: number | null; subjects: TranscriptSubject[] } {
  const cgpaMatch = html.match(/CGPA\s*:\s*([\d.]+)/i);
  const cgpa = cgpaMatch ? Number.parseFloat(cgpaMatch[1]) : null;

  const subjects: TranscriptSubject[] = [];
  for (const trMatch of html.matchAll(/<TR[^>]*>([\s\S]*?)<\/TR>/gi)) {
    const cells = [...trMatch[1].matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/gi)].map((m) => stripTags(m[1]));
    // Semester, Month&Year, Code, Description, Credit, Grade, Grade Points, Result, Attempt
    if (cells.length !== 9) continue;
    const [semester, , code, name, credit] = cells;
    if (!/^\d+$/.test(semester) || !code) continue;
    subjects.push({
      semester: Number(semester),
      code,
      name,
      credit: credit ? Number(credit) : null,
    });
  }
  return { cgpa, subjects };
}

export interface RegisteredCourse {
  code: string;
  name: string;
  slot: string | null;
  facultyName: string | null;
  courseType: string | null;
  credit: number | null;
}

export function cleanFacultyName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let name = stripTags(raw).trim();
  // Strip employee codes prefix/suffix like "100234 - Dr. Pranab Mandal" or "Dr. Pranab Mandal (100234)"
  name = name.replace(/^\d+\s*[-–:]\s*/, "").replace(/\s*\(\d+\)$/, "");
  // Strip designation/department suffix like "Dr. Pranab Mandal / AP / PHY" or "Dr. Pranab Mandal - Assistant Professor"
  name = name.split(/\s*[\/\-–]\s*(?:AP|Prof|Assistant|Associate|Professor|Dept|Department|PHY|CSE|ECE|MECH|CIVIL|MATHS|BIO)/i)[0].trim();

  if (name.length < 3 || /^(tba|not assigned|staff|null|undefined|none|-|--)$/i.test(name)) {
    return null;
  }
  // Must have alphabetical characters
  if (!/[a-zA-Z]{3,}/.test(name)) return null;

  // Title case if in ALL CAPS
  if (name === name.toUpperCase() && name.length > 4) {
    name = name
      .toLowerCase()
      .split(" ")
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
  }
  name = name
    .replace(/^Dr\.?\s+/i, "Dr. ")
    .replace(/^Prof\.?\s+/i, "Prof. ")
    .replace(/^Mr\.?\s+/i, "Mr. ")
    .replace(/^Ms\.?\s+/i, "Ms. ")
    .replace(/^Mrs\.?\s+/i, "Mrs. ")
    .trim();

  return name;
}

export function cleanSlot(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const slot = stripTags(raw).replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/.test(slot) && slot.length <= 8) {
    if (!/^(THEORY|PRACTICAL|LAB|PROJECT|REGULAR|AUDIT|CORE|ELECTIVE|REGULAR|PASS)$/i.test(slot)) {
      return slot;
    }
  }
  return null;
}

export function parseCourseList(...htmlSources: (string | undefined)[]): Record<string, RegisteredCourse> {
  const result: Record<string, RegisteredCourse> = {};

  for (const html of htmlSources) {
    if (!html || typeof html !== "string") continue;

    const allRows: string[][] = [];
    for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const rowContent = trMatch[1];
      const cells = [...rowContent.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]).trim());
      if (cells.length >= 2) {
        allRows.push(cells);
      }
    }

    if (allRows.length === 0) continue;

    // 1. Try to find a header row
    const headerMap: {
      code?: number;
      name?: number;
      slot?: number;
      faculty?: number;
      type?: number;
      credit?: number;
    } = {};

    for (const row of allRows) {
      const rowStr = row.join(" ").toLowerCase();
      if (rowStr.includes("course") || rowStr.includes("subject") || rowStr.includes("code") || rowStr.includes("faculty") || rowStr.includes("slot") || rowStr.includes("teacher")) {
        row.forEach((cell, idx) => {
          const c = cell.toLowerCase().trim();
          if (c.includes("course code") || c.includes("sub code") || c.includes("subject code") || c === "code") headerMap.code = idx;
          else if (c.includes("course title") || c.includes("course name") || c.includes("sub desc") || c.includes("subject description") || c.includes("subject name") || c.includes("description") || c.includes("title")) headerMap.name = idx;
          else if (c === "slot" || c.includes("slot code") || c.includes("course slot") || c === "batch/slot" || c.includes("slot")) headerMap.slot = idx;
          else if (c.includes("faculty") || c.includes("teacher") || c.includes("staff") || c.includes("instructor") || c.includes("handled by") || c.includes("advisor")) headerMap.faculty = idx;
          else if (c === "type" || c.includes("course type")) headerMap.type = idx;
          else if (c === "credit" || c.includes("credits")) headerMap.credit = idx;
        });
        if (headerMap.code !== undefined && (headerMap.faculty !== undefined || headerMap.slot !== undefined || headerMap.name !== undefined)) {
          break;
        }
      }
    }

    // 2. Parse data rows
    for (const cells of allRows) {
      const firstCell = (cells[0] || "").toLowerCase();
      if (firstCell.includes("s.no") || firstCell.includes("subject code") || firstCell.includes("course code") || firstCell.includes("sl.no")) {
        continue;
      }

      let code = "";
      let codeIndex = -1;

      if (headerMap.code !== undefined && /^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[headerMap.code])) {
        code = cells[headerMap.code].toUpperCase();
        codeIndex = headerMap.code;
      } else {
        for (let i = 0; i < cells.length; i++) {
          if (/^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[i])) {
            code = cells[i].toUpperCase();
            codeIndex = i;
            break;
          }
        }
      }

      if (!code) continue;

      let name = "";
      let slot: string | null = null;
      let facultyName: string | null = null;
      let courseType: string | null = null;
      let credit: number | null = null;

      if (headerMap.name !== undefined && cells[headerMap.name]) {
        name = cells[headerMap.name];
      } else if (codeIndex + 1 < cells.length && isNaN(Number(cells[codeIndex + 1]))) {
        name = cells[codeIndex + 1];
      }

      if (headerMap.slot !== undefined && cells[headerMap.slot]) {
        slot = cleanSlot(cells[headerMap.slot]);
      }

      if (headerMap.faculty !== undefined && cells[headerMap.faculty]) {
        facultyName = cleanFacultyName(cells[headerMap.faculty]);
      }

      if (headerMap.type !== undefined && cells[headerMap.type]) {
        courseType = cells[headerMap.type];
      }

      if (headerMap.credit !== undefined && cells[headerMap.credit]) {
        const parsedCredit = parseInt(cells[headerMap.credit], 10);
        if (!isNaN(parsedCredit)) credit = parsedCredit;
      }

      // Fallback cell inspection if headers were not present or incomplete
      if (!slot || !facultyName) {
        for (let i = codeIndex + 1; i < cells.length; i++) {
          const val = cells[i];
          if (!val) continue;

          if (!slot) {
            const candidateSlot = cleanSlot(val);
            if (candidateSlot) slot = candidateSlot;
          }

          if (!facultyName) {
            if (/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)/i.test(val) || /^\d{4,8}\s*[-–:]/i.test(val) || (/[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(val) && !/^(theory|practical|elective|regular|semester)/i.test(val))) {
              const candidateFaculty = cleanFacultyName(val);
              if (candidateFaculty && candidateFaculty.toLowerCase() !== name.toLowerCase()) {
                facultyName = candidateFaculty;
              }
            }
          }
        }
      }

      // Merge into result (keep existing values if new ones are null)
      const existing = result[code] || {};
      result[code] = {
        code,
        name: name || existing.name || code,
        slot: slot || existing.slot || null,
        facultyName: facultyName || existing.facultyName || null,
        courseType: courseType || existing.courseType || null,
        credit: credit !== null ? credit : (existing.credit ?? null),
      };
    }
  }

  return result;
}

export interface AttendanceCourse {
  courseCode: string;
  courseName: string;
  slot: string | null;
  facultyName: string | null;
  conductedHours: number;
  attendedHours: number;
  absentHours: number;
  attendancePercentage: number;
  classesNeeded: number;
  safeBunks: number;
}

export function calculateAttendanceMetrics(conducted: number, attended: number) {
  const percentage = conducted > 0 ? Number(((attended / conducted) * 100).toFixed(2)) : 100.0;
  // To reach 75%: (attended + x) / (conducted + x) >= 0.75 => x >= 3 * conducted - 4 * attended
  const classesNeeded = percentage < 75.0 ? Math.max(0, Math.ceil(3 * conducted - 4 * attended)) : 0;
  // To stay above 75%: (attended) / (conducted + y) >= 0.75 => y <= (4 * attended - 3 * conducted) / 3
  const safeBunks = percentage >= 75.0 ? Math.max(0, Math.floor((4 * attended - 3 * conducted) / 3)) : 0;

  return { percentage, classesNeeded, safeBunks };
}

export function parseAttendance(
  html: string,
  courseListDetails: Record<string, RegisteredCourse> = {},
): AttendanceCourse[] {
  const courses: AttendanceCourse[] = [];
  if (!html) return courses;

  const allRows: string[][] = [];
  for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowContent = trMatch[1];
    const cells = [...rowContent.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]).trim());
    if (cells.length >= 3) {
      allRows.push(cells);
    }
  }

  if (allRows.length === 0) return courses;

  // 1. Try to find a header row to map column indices dynamically
  const headerMap: {
    code?: number;
    name?: number;
    maxHours?: number;
    conducted?: number;
    present?: number;
    absent?: number;
    od?: number;
    percentage?: number;
    slot?: number;
    faculty?: number;
  } = {};

  for (const row of allRows) {
    const rowStr = row.join(" ").toLowerCase();
    if (rowStr.includes("subject") || rowStr.includes("course") || rowStr.includes("conducted") || rowStr.includes("present")) {
      row.forEach((cell, idx) => {
        const c = cell.toLowerCase().trim();
        const isPct = c.includes("%") || c.includes("percent");

        if (!isPct) {
          if (c.includes("subject code") || c.includes("course code") || c === "code") headerMap.code = idx;
          else if (c.includes("subject desc") || c.includes("course name") || c.includes("course title") || c.includes("description") || c.includes("subject name")) headerMap.name = idx;
          else if (c.includes("max") || c.includes("total planned") || c.includes("planned")) headerMap.maxHours = idx;
          else if (c.includes("conducted") || c.includes("classes held") || c.includes("total classes") || c.includes("total hrs") || c.includes("total hours")) headerMap.conducted = idx;
          else if (c.includes("present") || c.includes("attended") || c.includes("hours attended") || c.includes("attended hrs") || c === "p") headerMap.present = idx;
          else if (c.includes("absent") || c.includes("hours absent") || c.includes("absent hrs") || c === "a") headerMap.absent = idx;
          else if (c.includes("od") || c.includes("ml") || c.includes("on duty") || c.includes("medical leave")) headerMap.od = idx;
          else if (c === "slot" || c === "slot code" || c === "course slot") headerMap.slot = idx;
          else if (c.includes("faculty name") || c.includes("teacher name") || c.includes("staff name") || c === "faculty") headerMap.faculty = idx;
        } else {
          if (c.includes("attendance") || c.includes("total") || headerMap.percentage === undefined) {
            headerMap.percentage = idx;
          }
        }
      });
      if (headerMap.code !== undefined || (headerMap.conducted !== undefined && headerMap.present !== undefined)) {
        break;
      }
    }
  }

  // 2. Parse course rows
  for (const cells of allRows) {
    if (cells[0].toLowerCase().includes("subject") || cells[0].toLowerCase().includes("s.no") || cells[1]?.toLowerCase().includes("subject description")) {
      continue;
    }

    let code = "";
    let codeIndex = -1;

    if (headerMap.code !== undefined && /^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[headerMap.code])) {
      code = cells[headerMap.code].toUpperCase();
      codeIndex = headerMap.code;
    } else {
      for (let i = 0; i < cells.length; i++) {
        if (/^[A-Z]{2,4}\s*\d{3}[A-Z0-9]*$/i.test(cells[i])) {
          code = cells[i].toUpperCase();
          codeIndex = i;
          break;
        }
      }
    }

    if (!code) continue;

    const registered = courseListDetails[code] || {};
    let name = registered.name || "";
    let slot = registered.slot || null;
    let facultyName = registered.facultyName || null;

    if (headerMap.name !== undefined && cells[headerMap.name]) {
      name = cells[headerMap.name];
    } else if (codeIndex + 1 < cells.length && isNaN(Number(cells[codeIndex + 1]))) {
      name = cells[codeIndex + 1];
    }
    if (!name) name = code;

    if (headerMap.slot !== undefined && cells[headerMap.slot]) {
      const candidateSlot = cells[headerMap.slot].trim();
      if (/^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/i.test(candidateSlot) && candidateSlot.length <= 6) {
        slot = candidateSlot.toUpperCase();
      }
    }
    if (headerMap.faculty !== undefined && cells[headerMap.faculty]) {
      const candidateFaculty = cells[headerMap.faculty].trim();
      if (candidateFaculty.length >= 3 && !/^\d+$/.test(candidateFaculty)) {
        facultyName = candidateFaculty;
      }
    }

    let conducted = -1;
    let present = -1;
    let absent = -1;
    let od = 0;

    // Use dynamic header map if available
    if (headerMap.conducted !== undefined && headerMap.present !== undefined) {
      const c = parseFloat(cells[headerMap.conducted]);
      const p = parseFloat(cells[headerMap.present]);
      const a = headerMap.absent !== undefined ? parseFloat(cells[headerMap.absent]) : NaN;
      const o = headerMap.od !== undefined ? parseFloat(cells[headerMap.od]) : NaN;
      if (!isNaN(c) && !isNaN(p)) {
        conducted = c;
        present = p;
        if (!isNaN(a)) absent = a;
        if (!isNaN(o)) od = o;
      }
    }

    // Standard SRM AP Portal standard table layout:
    // [Subject Code (0), Subject Description (1), Max Hours (2), Conducted (3), Present (4), Absent (5), OD/ML (6), Present % (7), OD % (8), Total % (9)]
    if (conducted < 0 && cells.length >= 6 && codeIndex === 0) {
      const cond = parseFloat(cells[3]);
      const pres = parseFloat(cells[4]);
      const abs = parseFloat(cells[5]);
      const odVal = cells.length > 6 ? parseFloat(cells[6]) : 0;

      if (!isNaN(cond) && !isNaN(pres)) {
        conducted = cond;
        present = pres;
        absent = !isNaN(abs) ? abs : Math.max(0, conducted - present);
        od = !isNaN(odVal) ? odVal : 0;
      }
    }

    // Fallback: If table layout is [Code, Description, Conducted, Present, Absent, OD, %] (no Max Hours column)
    if (conducted < 0 && cells.length >= 5 && codeIndex === 0) {
      const c1 = parseFloat(cells[2]);
      const c2 = parseFloat(cells[3]);
      const c3 = parseFloat(cells[4]);
      if (!isNaN(c1) && !isNaN(c2) && !isNaN(c3) && (c2 + c3 === c1 || c2 <= c1)) {
        conducted = c1;
        present = c2;
        absent = c3;
      }
    }

    // Generic numeric fallback parser
    if (conducted < 0 || present < 0) {
      const numbers: number[] = [];
      for (let i = codeIndex + 1; i < cells.length; i++) {
        const val = parseFloat(cells[i].replace("%", "").trim());
        if (!isNaN(val)) {
          numbers.push(val);
        }
      }

      if (numbers.length >= 4 && numbers[1] >= numbers[2]) {
        conducted = numbers[1];
        present = numbers[2];
        absent = numbers[3];
        if (numbers.length >= 5 && numbers[4] < conducted) {
          od = numbers[4];
        }
      } else if (numbers.length >= 2) {
        conducted = numbers[0];
        present = numbers[1];
        absent = numbers.length >= 3 ? numbers[2] : Math.max(0, conducted - present);
      }
    }

    if (conducted >= 0 && present >= 0) {
      const effectiveAttended = Math.min(conducted, present + (isNaN(od) ? 0 : od));
      const effectiveAbsent = absent >= 0 ? absent : Math.max(0, conducted - effectiveAttended);
      const metrics = calculateAttendanceMetrics(conducted, effectiveAttended);

      courses.push({
        courseCode: code,
        courseName: name || code,
        slot,
        facultyName,
        conductedHours: conducted,
        attendedHours: effectiveAttended,
        absentHours: effectiveAbsent,
        attendancePercentage: metrics.percentage,
        classesNeeded: metrics.classesNeeded,
        safeBunks: metrics.safeBunks,
      });
    }
  }

  return courses;
}

// --- login + section fetch, shared by the human-supervised and unattended paths ---

export interface LoginResult {
  loggedIn: boolean;
  jar: Jar;
  errorMessage?: string;
}

/**
 * Submits the one real login attempt. Callers must never log `dobPassword` or
 * any part of the response body — only the classified `errorMessage`, which
 * comes from known-safe substring checks (the portal's failure page does not
 * echo submitted values back, verified against the real portal).
 */
export async function doLogin(
  jar: Jar,
  registerNumber: string,
  dobPassword: string,
  captcha: string,
): Promise<LoginResult> {
  const loginBody = new URLSearchParams({
    UserName: registerNumber,
    AuthKey: dobPassword,
    ccode: captcha,
    txtUserName: registerNumber,
    txtAuthKey: dobPassword,
  });
  const loginRes = await fetch(`${PORTAL_BASE}/StudentLoginToPortal`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(jar),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: loginBody.toString(),
    redirect: "manual",
  });

  const loggedIn = loginRes.status === 302;
  if (loggedIn) {
    return { loggedIn: true, jar: mergeSetCookies(jar, loginRes) };
  }

  let errorMessage = "Couldn't sign in — check your register number, portal password, and try again.";
  const text = await loginRes.text();
  if (text.includes("Captcha Invalid")) errorMessage = "That captcha didn't match — try again.";
  else if (text.includes("Invalid User ID or Password")) errorMessage = "Register number or portal password (default DOB DDMMYYYY or custom password) is incorrect.";

  return { loggedIn: false, jar, errorMessage };
}

export async function fetchAcademicSections(
  jar: Jar,
): Promise<{
  profileHtml: string;
  courseListHtml: string;
  transcriptHtml: string;
  attendanceHtml: string;
  timeTableHtml: string;
  internalMarksHtml: string;
  examDetailsHtml: string;
}> {
  const fetchSection = (id: number) =>
    fetch(`${PORTAL_BASE}/students/report/studentreportresources.jsp`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader(jar),
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: `ids=${id}`,
    })
      .then((r) => r.text())
      .catch((err) => {
        console.warn(`Failed to fetch report section ${id}:`, err);
        return "";
      });

  const [
    profileHtml,
    courseListHtml,
    attendanceHtml,
    internalMarksHtml,
    timeTableHtml,
    transcriptHtml,
    examDetailsHtml,
  ] = await Promise.all([
    fetchSection(1),
    fetchSection(2),
    fetchSection(3),
    fetchSection(4),
    fetchSection(5),
    fetchSection(6),
    fetchSection(7),
  ]);

  return {
    profileHtml,
    courseListHtml,
    transcriptHtml,
    attendanceHtml,
    timeTableHtml,
    internalMarksHtml,
    examDetailsHtml,
  };
}

export async function fetchLoginPageAndCaptcha(): Promise<{ jar: Jar; imageBytes: Uint8Array; contentType: string }> {
  const loginPageRes = await fetch(`${PORTAL_BASE}/HRDSystem`, { redirect: "manual" });
  let jar = mergeSetCookies({}, loginPageRes);

  const captchaRes = await fetch(`${PORTAL_BASE}/captchas`, {
    headers: { Cookie: cookieHeader(jar) },
    redirect: "manual",
  });
  jar = mergeSetCookies(jar, captchaRes);

  if (!captchaRes.ok) throw new Error("SRM portal is unavailable right now.");

  const imageBytes = new Uint8Array(await captchaRes.arrayBuffer());
  const contentType = captchaRes.headers.get("content-type") || "image/png";
  return { jar, imageBytes, contentType };
}

