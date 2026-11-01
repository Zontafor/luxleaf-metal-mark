import { processMask, type MaskSettings } from "./mask.js";
export type ReliefSettings = Pick<
  MaskSettings,
  "mode" | "threshold" | "invert"
>;

function sample(
  data: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
) {
  x = Math.max(0, Math.min(width - 1, x));
  y = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    x1 = Math.min(x0 + 1, width - 1),
    y1 = Math.min(y0 + 1, height - 1),
    fx = x - x0,
    fy = y - y0;
  return (
    (data[y0 * width + x0] * (1 - fx) + data[y0 * width + x1] * fx) * (1 - fy) +
    (data[y1 * width + x0] * (1 - fx) + data[y1 * width + x1] * fx) * fy
  );
}
/** Solve -Laplacian(u)=1 inside the silhouette with zero boundary height.
 * Coarse-to-fine initialization avoids the distance field's medial-axis ridges.
 * The square-root profile forms a rounded cap; this is geometry, not fluid dynamics.
 */
function membrane(
  coverage: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
) {
  let field = new Float32Array(1),
    oldW = 1,
    oldH = 1;
  const maximum = Math.min(256, Math.max(width, height));
  const levels = [64, 128, maximum]
    .filter((n, i, all) => n <= maximum && all.indexOf(n) === i)
    .sort((a, b) => a - b);
  let totalIterations = 0;
  for (const size of levels) {
    const scale = size / Math.max(width, height),
      w = Math.max(3, Math.round(width * scale)),
      h = Math.max(3, Math.round(height * scale));
    const inside = new Uint8Array(w * h),
      next = new Float32Array(w * h),
      factor = (w / oldW) ** 2;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const sx = Math.min(width - 1, Math.floor(((x + 0.5) * width) / w)),
          sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / h)),
          i = y * w + x;
        inside[i] =
          coverage[(sy * width + sx) * 4 + 3] / 255 >= threshold ? 1 : 0;
        if (inside[i] && oldW > 1)
          next[i] =
            sample(
              field,
              oldW,
              oldH,
              ((x + 0.5) * oldW) / w - 0.5,
              ((y + 0.5) * oldH) / h - 0.5,
            ) * factor;
      }
    const omega = size <= 64 ? 1.8 : size <= 128 ? 1.9 : 1.93;
    for (let iteration = 0; iteration < 650; iteration++) {
      let delta = 0;
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!inside[i]) continue;
          const value = Math.max(
            0,
            next[i] +
              omega *
                ((next[i - 1] + next[i + 1] + next[i - w] + next[i + w] + 1) *
                  0.25 -
                  next[i]),
          );
          delta = Math.max(delta, Math.abs(value - next[i]));
          next[i] = value;
        }
      totalIterations++;
      if (iteration > 32 && delta < 0.002) break;
    }
    field = next;
    oldW = w;
    oldH = h;
  }
  for (let i = 0; i < field.length; i++) field[i] = 2 * Math.sqrt(field[i]);
  // A small, contiguous filter smooths raster boundaries without changing alpha.
  const radius = Math.max(1, Math.round(maximum / 128));
  for (let pass = 0; pass < 2; pass++)
    for (const horizontal of [true, false]) {
      const next = new Float32Array(field.length),
        length = horizontal ? oldW : oldH,
        lines = horizontal ? oldH : oldW;
      const prefix = new Float64Array(length + 1);
      for (let line = 0; line < lines; line++) {
        const index = (p: number) =>
          horizontal ? line * oldW + p : p * oldW + line;
        prefix[0] = 0;
        for (let p = 0; p < length; p++)
          prefix[p + 1] = prefix[p] + field[index(p)];
        for (let p = 0; p < length; p++) {
          const l = Math.max(0, p - radius),
            r = Math.min(length, p + radius + 1);
          next[index(p)] = (prefix[r] - prefix[l]) / (r - l);
        }
      }
      field = next;
    }
  return {
    heights: field,
    width: oldW,
    height: oldH,
    iterations: totalIterations,
  };
}

/** Float relief/normal texture plus a byte preview. Original silhouette coverage is retained. */
export function buildRelief(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  settings: ReliefSettings = {},
) {
  const source = processMask(rgba, width, height, settings);
  const solution = membrane(
    source.pixels,
    width,
    height,
    settings.threshold ?? 0.5,
  );
  const heights = solution.heights,
    w = solution.width,
    h = solution.height;
  const nx = new Float32Array(heights.length),
    ny = new Float32Array(heights.length);
  let maximum = 1;
  for (const value of heights) maximum = Math.max(maximum, value);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      nx[i] =
        (heights[y * w + Math.min(w - 1, x + 1)] -
          heights[y * w + Math.max(0, x - 1)]) *
        0.325;
      ny[i] =
        (heights[Math.min(h - 1, y + 1) * w + x] -
          heights[Math.max(0, y - 1) * w + x]) *
        0.325;
    }
  const field = new Float32Array(rgba.length),
    pixels = new Uint8ClampedArray(rgba.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        gx = ((x + 0.5) * w) / width - 0.5,
        gy = ((y + 0.5) * h) / height - 0.5;
      const dx = sample(nx, w, h, gx, gy),
        dy = sample(ny, w, h, gx, gy),
        length = Math.hypot(dx, dy, 1);
      field[4 * i] = sample(heights, w, h, gx, gy) / maximum;
      field[4 * i + 1] = 0.5 - (0.5 * dx) / length;
      field[4 * i + 2] = 0.5 + (0.5 * dy) / length;
      field[4 * i + 3] = source.pixels[4 * i + 3] / 255;
    }
  for (let i = 0; i < field.length; i++) pixels[i] = Math.round(field[i] * 255);
  return {
    pixels,
    field,
    width,
    height,
    mode: source.mode,
    solver: { width: w, height: h, iterations: solution.iterations },
  };
}
