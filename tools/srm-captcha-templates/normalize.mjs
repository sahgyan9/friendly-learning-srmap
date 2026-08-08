// Crops one glyph's ink bounding box (both axes, not just the horizontal
// segment) and resizes it to a fixed small binary grid, so glyphs of
// different pixel size/position become directly comparable.

const INK_THRESHOLD = 200;
export const GRID_W = 12;
export const GRID_H = 18;

function isInk(pixels, width, x, y) {
  const i = (y * width + x) * 3;
  return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 < INK_THRESHOLD;
}

/** Returns a Uint8Array of length GRID_W*GRID_H, 1 = ink, 0 = background. */
export function normalizeGlyph({ width, height, pixels }, box) {
  let y0 = height;
  let y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      if (isInk(pixels, width, x, y)) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (y1 < y0) { y0 = 0; y1 = height - 1; } // no ink found (shouldn't happen post-segmentation)

  const srcW = box.x1 - box.x0;
  const srcH = y1 - y0 + 1;
  const grid = new Uint8Array(GRID_W * GRID_H);
  for (let gy = 0; gy < GRID_H; gy++) {
    const sy = y0 + Math.floor((gy / GRID_H) * srcH);
    for (let gx = 0; gx < GRID_W; gx++) {
      const sx = box.x0 + Math.floor((gx / GRID_W) * srcW);
      grid[gy * GRID_W + gx] = isInk(pixels, width, sx, sy) ? 1 : 0;
    }
  }
  return grid;
}

export function hammingDistance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d += 1;
  return d;
}
