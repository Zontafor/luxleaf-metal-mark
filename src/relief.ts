import { distanceField, processMask, type MaskSettings } from "./mask.js";
/** Rounded height field with resolution-scaled unit normals. Silhouette alpha and holes are retained. */
export function buildRelief(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  settings: MaskSettings = {}
) {
  const source = processMask(rgba, width, height, settings);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++)
    mask[i] = source.pixels[i * 4 + 3] >= 128 ? 1 : 0;
  const distance = distanceField(mask, width, height);
  let radius = 1;
  for (const d of distance) radius = Math.max(radius, d);
  let heights = new Float32Array(mask.length);
  for (let i = 0; i < heights.length; i++)
    heights[i] =
      Math.sqrt(Math.max(0, distance[i] * (2 * radius - distance[i]))) / radius;
  const step = Math.max(1, Math.round(Math.min(width, height) / 256));
  // Three separable box passes approximate a Gaussian. Contiguous samples avoid
  // strided-kernel contour aliasing; blur outside the mask too, then retain the
  // original coverage only in the final output alpha.
  const blurRadius = 2 * step;
  for (let pass = 0; pass < 3; pass++)
    for (const horizontal of [true, false]) {
      const next = new Float32Array(heights.length);
      const length = horizontal ? width : height;
      const lines = horizontal ? height : width;
      const prefix = new Float64Array(length + 1);
      for (let line = 0; line < lines; line++) {
        const index = (position: number) => horizontal
          ? line * width + position : position * width + line;
        prefix[0] = 0;
        for (let p = 0; p < length; p++) prefix[p + 1] = prefix[p] + heights[index(p)];
        for (let p = 0; p < length; p++) {
          const left = Math.max(0, p - blurRadius), right = Math.min(length, p + blurRadius + 1);
          next[index(p)] = (prefix[right] - prefix[left]) / (right - left);
        }
      }
      heights = next;
    }
  const at = (x: number, y: number) =>
    heights[
      Math.max(0, Math.min(height - 1, y)) * width +
        Math.max(0, Math.min(width - 1, x))
    ];
  const pixels = new Uint8ClampedArray(source.pixels.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const dx =
        ((at(x + step, y) - at(x - step, y)) * radius * 0.65) / (2 * step);
      const dy =
        ((at(x, y + step) - at(x, y - step)) * radius * 0.65) / (2 * step);
      const length = Math.hypot(dx, dy, 1);
      pixels[4 * i] = Math.round(255 * heights[i]);
      pixels[4 * i + 1] = Math.round(255 * (0.5 - (0.5 * dx) / length));
      // Canvas rows run down; the uploaded WebGL texture is flipped to y-up.
      pixels[4 * i + 2] = Math.round(255 * (0.5 + (0.5 * dy) / length));
      pixels[4 * i + 3] = source.pixels[4 * i + 3];
    }
  return { pixels, width, height, mode: source.mode };
}
