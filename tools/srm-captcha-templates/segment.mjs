// Column-projection character segmentation. Fixed pixel-offset cropping does
// NOT work here -- captchas render 4-5 characters into the same 220x30 canvas
// with the character count varying, so cell positions shift. This instead
// finds actual ink columns and splits on gaps.
//
// Gap-splitting alone isn't sufficient: some letter/digit pairs render with
// no real background gap between them at all (observed: Y+8, X+4, A+8 all
// merge into one wide blob). Pass 2 looks for oversized boxes and splits them
// at their thinnest point (the "neck" where two glyphs visually touch but one
// has less ink than the other) -- a standard projection-profile-valley
// technique for exactly this failure mode.

const INK_THRESHOLD = 200; // sum of R+G+B channels averaged; text is dark olive/brown, background is near-white
const MIN_GAP = 2; // columns of background needed to count as a real gap, not anti-aliasing noise
const MIN_GLYPH_WIDTH = 3; // discard slivers (stray anti-aliasing, not a real character)
// Absolute, not relative: across every confirmed-correct segmentation seen so
// far, single glyphs range ~7-19px (a narrow "J"/"1" up to a wide "M"/"W")
// and merged pairs start at ~30px+. A ratio-to-the-narrowest-box-in-this-image
// approach was tried first and made things worse -- a legitimately narrow
// glyph (e.g. "J" at 7px) made the threshold so tight that ordinary
// 13-15px glyphs got flagged as "wide" and needlessly split. A fixed
// threshold in the gap between those two clusters is far more robust than
// deriving one from whatever few boxes happen to be in a given image.
const WIDE_BOX_WIDTH = 22;

function inkDensity(pixels, width, height, x) {
  let count = 0;
  for (let y = 0; y < height; y++) {
    const i = (y * width + x) * 3;
    const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    if (brightness < INK_THRESHOLD) count += 1;
  }
  return count;
}

/** Splits an oversized box at its lowest-density column, if there's a real valley (not just a flat blob). */
function splitAtValley(box, density) {
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
  // Require the valley to be a real dip, not a uniformly-thick single glyph.
  if (valleyX === -1 || peakDensity === 0 || valleyDensity / peakDensity > 0.6) return [box];
  const left = { x0: box.x0, x1: valleyX };
  const right = { x0: valleyX, x1: box.x1 };
  if (left.x1 - left.x0 < MIN_GLYPH_WIDTH || right.x1 - right.x0 < MIN_GLYPH_WIDTH) return [box];
  return [left, right];
}

/** Returns [{x0, x1}, ...] left-to-right, one per detected character. */
export function segmentCharacters({ width, height, pixels }) {
  const density = new Array(width);
  for (let x = 0; x < width; x++) density[x] = inkDensity(pixels, width, height, x);

  let boxes = [];
  let start = null;
  let gap = 0;
  for (let x = 0; x < width; x++) {
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
    const end = width - gap;
    if (end - start >= MIN_GLYPH_WIDTH) boxes.push({ x0: start, x1: end });
  }

  // Split oversized boxes, recursively -- a triple-merge (e.g. "644" fused
  // into one blob) needs two splits, not one, and a single pass only ever
  // applies one.
  let stable = false;
  while (!stable) {
    stable = true;
    const next = [];
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
