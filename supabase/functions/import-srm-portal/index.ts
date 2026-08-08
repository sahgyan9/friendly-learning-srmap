// Import a student's program/subjects/CGPA from the SRM AP student portal
// (student.srmap.edu.in — a third-party site we do not run and have no special
// access to; this replicates the same plain login form any student uses).
//
// HARD RULE: the portal password (the student's DOB) is used only to build the
// single login POST body below. It must never be logged, thrown in an Error,
// or written to any table — not even on failure. If you are adding error
// handling here, do not include the raw portal response body in it; the
// portal's failure page does not echo submitted values back (verified), but
// treat that as defense in depth, not a license to log it anyway.
//
// Two-step flow, and this split is load-bearing, not incidental:
//   step "captcha": fetch the login page + captcha image, return them to the
//     browser. No login is attempted here. An OCR guess may be attached, but
//     it is advisory only — the student confirms or corrects it before step 2,
//     because a wrong captcha guess is a real login attempt against the
//     student's actual SRM account (same as a wrong password), and the
//     portal's lockout policy is unknown. See the migration comment on
//     academic_imports.attempt_count for the throttle this backstops.
//   step "login": submits the confirmed captcha + credentials, once.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PORTAL_BASE = "https://student.srmap.edu.in/srmapstudentcorner";
const COLLEGE_ID_FORMAT = /^AP[0-9]{11}$/;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- cookie jar -------------------------------------------------------------
// The jar only ever holds the portal's pre-auth JSESSIONID (issued freely to
// any anonymous visitor of the login page) and, after a successful login, its
// now-authenticated counterpart. Neither is a secret of ours or the student's,
// so round-tripping it through the browser as an opaque base64 blob between
// the two calls is fine — simpler than standing up server-side session
// storage (a KV store, a scratch table with a TTL sweep) for a value that is
// itself short-lived and single-use regardless.
type Jar = Record<string, string>;

function mergeSetCookies(jar: Jar, res: Response): Jar {
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

function cookieHeader(jar: Jar): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function encodeSessionToken(jar: Jar): string {
  return btoa(JSON.stringify(jar));
}

function decodeSessionToken(token: string): Jar {
  return JSON.parse(atob(token));
}

// =============================================================================
// Captcha OCR (advisory only — see the note at the top of this file).
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
// regenerated). A guess this returns is NEVER submitted automatically; the
// student always sees the real captcha image and confirms or corrects it.
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

async function recognizeCaptcha(imageBytes: Uint8Array): Promise<{ guess: string | null; confidence: number }> {
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
    // Never let an OCR bug break the flow — the student typing the captcha
    // manually is the fallback this whole design already assumes.
    console.error("captcha OCR failed (non-fatal, falling back to manual entry):", error instanceof Error ? error.message : error);
    return { guess: null, confidence: 0 };
  }
}

// --- portal HTML parsing ----------------------------------------------------
// Plain string/regex extraction, not a DOM parser: the portal's markup is
// simple (regular <table>/<tr>/<td>, no attributes worth reading) and case-
// inconsistent (ids=6 uses uppercase <TR>/<TD>), which a regex handles as
// easily as a DOM query would, without adding a parser dependency to a Deno
// edge function for what is fundamentally "read some table cells".
function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

interface ProfileFields {
  program: string | null;
  currentSemester: number | null;
}

function parseProfile(html: string): ProfileFields {
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
  };
}

interface TranscriptSubject {
  semester: number;
  code: string;
  name: string;
  credit: number | null;
}

function parseTranscript(html: string): { cgpa: number | null; subjects: TranscriptSubject[] } {
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

// --- handler -----------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));

    // --- step 1: fetch login page + captcha, no login attempted ------------
    if (body.step === "captcha") {
      const loginPageRes = await fetch(`${PORTAL_BASE}/HRDSystem`, { redirect: "manual" });
      let jar = mergeSetCookies({}, loginPageRes);

      const captchaRes = await fetch(`${PORTAL_BASE}/captchas`, {
        headers: { Cookie: cookieHeader(jar) },
        redirect: "manual",
      });
      jar = mergeSetCookies(jar, captchaRes);

      if (!captchaRes.ok) return json({ error: "SRM portal is unavailable right now." }, 502);

      const imageBytes = new Uint8Array(await captchaRes.arrayBuffer());
      const contentType = captchaRes.headers.get("content-type") || "image/png";
      let binary = "";
      for (const byte of imageBytes) binary += String.fromCharCode(byte);
      const imageDataUrl = `data:${contentType};base64,${btoa(binary)}`;

      const { guess, confidence } = await recognizeCaptcha(imageBytes);

      return json({
        data: {
          sessionToken: encodeSessionToken(jar),
          imageDataUrl,
          guess,
          confidence,
        },
      });
    }

    // --- step 2: confirmed captcha + credentials, one real login attempt ---
    if (body.step === "login") {
      const { sessionToken, registerNumber, dobPassword, captcha } = body;
      if (!sessionToken || !registerNumber || !dobPassword || !captcha) {
        return json({ error: "Missing required fields." }, 400);
      }
      if (!COLLEGE_ID_FORMAT.test(registerNumber)) {
        return json({ error: "That doesn't look like a valid SRM AP register number (e.g. AP23111260062)." }, 400);
      }

      // Bind to the caller's own identity — reject an attempt to import under
      // someone else's register number, claim it (first-write-wins) if the
      // caller has none on file yet.
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("college_id")
        .eq("id", userId)
        .single();
      if (profile?.college_id && profile.college_id !== registerNumber) {
        return json({ error: "This register number doesn't match the one linked to your account." }, 403);
      }

      // Rate limit — read-before-write, ahead of ever calling the portal.
      // The DB trigger (academic_imports_rate_limit) is the backstop if this
      // check is ever bypassed.
      const { data: existing } = await supabaseAdmin
        .from("academic_imports")
        .select("attempt_count, last_attempt_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (
        existing?.last_attempt_at &&
        existing.attempt_count >= 5 &&
        Date.now() - new Date(existing.last_attempt_at).getTime() < 15 * 60 * 1000
      ) {
        return json({ error: "Too many import attempts. Try again in a few minutes." }, 429);
      }

      let jar: Jar;
      try {
        jar = decodeSessionToken(sessionToken);
      } catch {
        return json({ error: "That session expired — request a new captcha and try again." }, 400);
      }

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
      // NOTE: deliberately never reading/logging loginRes's body on failure.
      const loggedIn = loginRes.status === 302;

      const attemptCount = (existing?.attempt_count ?? 0) + 1;
      const nowIso = new Date().toISOString();

      if (!loggedIn) {
        let errorMessage = "Couldn't sign in — check your register number, password, and try again.";
        // Best-effort classification, from a known-safe check (no submitted
        // values are ever echoed into this page — verified against the real
        // portal), not from logging the body anywhere.
        const text = await loginRes.text();
        if (text.includes("Captcha Invalid")) errorMessage = "That captcha didn't match — try again.";
        else if (text.includes("Invalid User ID or Password")) errorMessage = "Register number or password is incorrect.";

        await supabaseAdmin.from("academic_imports").upsert({
          user_id: userId,
          register_number: registerNumber,
          sync_status: "failed",
          last_error: errorMessage,
          attempt_count: attemptCount,
          last_attempt_at: nowIso,
        }, { onConflict: "user_id" });

        return json({ error: errorMessage }, 401);
      }

      jar = mergeSetCookies(jar, loginRes);

      const fetchSection = (id: number) =>
        fetch(`${PORTAL_BASE}/students/report/studentreportresources.jsp`, {
          method: "POST",
          headers: {
            Cookie: cookieHeader(jar),
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: `ids=${id}`,
        }).then((r) => r.text());

      const [profileHtml, transcriptHtml] = await Promise.all([fetchSection(1), fetchSection(6)]);
      const { program, currentSemester } = parseProfile(profileHtml);
      const { cgpa, subjects } = parseTranscript(transcriptHtml);

      await supabaseAdmin.from("academic_imports").upsert({
        user_id: userId,
        register_number: registerNumber,
        program,
        current_semester: currentSemester,
        subjects,
        cgpa,
        sync_status: "success",
        last_error: null,
        last_synced_at: nowIso,
        attempt_count: 1, // resets on success — only a *consecutive* run of failures throttles
        last_attempt_at: nowIso,
      }, { onConflict: "user_id" });

      // Best-effort claim. A successful portal login is proof of ownership of
      // this register number, so this should not normally conflict; if it
      // somehow does (stale data elsewhere), don't fail the import over it —
      // the subjects/CGPA are still real and worth saving.
      if (!profile?.college_id) {
        await supabaseAdmin
          .from("users")
          .update({ college_id: registerNumber })
          .eq("id", userId)
          .then(({ error }) => {
            if (error) console.error("college_id claim skipped (non-fatal):", error.code);
          });
      }

      return json({
        data: {
          program,
          currentSemester,
          cgpa,
          subjectCount: subjects.length,
        },
      });
    }

    return json({ error: "Unknown step." }, 400);
  } catch (error) {
    console.error("import-srm-portal error:", error instanceof Error ? error.message : error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
