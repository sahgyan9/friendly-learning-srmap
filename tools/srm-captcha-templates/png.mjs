// Minimal PNG decoder for the SRM captcha images specifically (8-bit RGB,
// no interlacing, standard filters) -- no dependency needed since Node's
// built-in zlib does the actual decompression; this just handles PNG's
// chunk framing and per-scanline unfiltering.
import zlib from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("Not a PNG");

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      if (data.readUInt8(12) !== 0) throw new Error("Interlaced PNGs not supported");
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 8 + length + 4; // length + type + data + crc
  }

  if (bitDepth !== 8) throw new Error(`Only 8-bit PNGs supported, got bit depth ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported color type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const pixels = new Uint8Array(width * height * 3); // always normalise to RGB

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
      let value;
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
