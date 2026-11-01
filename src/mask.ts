export type MaskMode = "auto" | "alpha" | "luminance";
export interface MaskSettings {
  mode?: MaskMode;
  threshold?: number;
  invert?: boolean;
  bevel?: number;
}
/** Squared Euclidean distance transform; linear work per row/column. */
function distance1D(f: Float64Array, n: number, out: Float64Array) {
  const v = new Int32Array(n),
    z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    out[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}
export function distanceField(mask: Uint8Array, width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 4_194_304 ||
    mask.length !== width * height
  )
    throw new Error("Invalid mask dimensions");
  const size = width * height,
    stage = new Float64Array(size),
    result = new Float32Array(size),
    n = Math.max(width, height),
    input = new Float64Array(n),
    output = new Float64Array(n),
    far = (width + height) ** 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) input[x] = mask[y * width + x] ? far : 0;
    distance1D(input, width, output);
    for (let x = 0; x < width; x++) stage[y * width + x] = output[x];
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) input[y] = stage[y * width + x];
    distance1D(input, height, output);
    for (let y = 0; y < height; y++)
      result[y * width + x] = Math.min(
        Math.sqrt(output[y]),
        x + 1,
        y + 1,
        width - x,
        height - y,
      );
  }
  return result;
}
/** Encode height in red, normal in green/blue, original silhouette in alpha. */
export function processMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  settings: MaskSettings = {},
) {
  if (rgba.length !== width * height * 4)
    throw new Error("RGBA length mismatch");
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 4_194_304
  )
    throw new Error("Image exceeds processing budget");
  const threshold = settings.threshold ?? 0.5,
    bevel = settings.bevel ?? 12;
  if (
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1 ||
    !Number.isFinite(bevel) ||
    bevel < 1 ||
    bevel > 128
  )
    throw new Error("Invalid mask parameters");
  if (settings.mode && !["auto", "alpha", "luminance"].includes(settings.mode))
    throw new Error("Invalid mask mode");
  let alpha = false;
  for (let i = 3; i < rgba.length; i += 4)
    if (rgba[i] < 250) {
      alpha = true;
      break;
    }
  const mode =
    settings.mode === "auto" || !settings.mode
      ? alpha
        ? "alpha"
        : "luminance"
      : settings.mode;
  const mask = new Uint8Array(width * height),
    coverage = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    let a =
      mode === "alpha"
        ? rgba[i * 4 + 3] / 255
        : 1 -
          (0.2126 * rgba[i * 4] +
            0.7152 * rgba[i * 4 + 1] +
            0.0722 * rgba[i * 4 + 2]) /
            255;
    if (settings.invert) a = 1 - a;
    coverage[i] = Math.round(a * 255);
    mask[i] = a >= threshold ? 1 : 0;
  }
  const distance = distanceField(mask, width, height),
    pixels = new Uint8ClampedArray(rgba.length);
  const value = (x: number, y: number) =>
    Math.min(
      1,
      distance[
        Math.max(0, Math.min(height - 1, y)) * width +
          Math.max(0, Math.min(width - 1, x))
      ] / bevel,
    );
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        h = value(x, y),
        dx = (value(x + 1, y) - value(x - 1, y)) * 0.5,
        dy = (value(x, y + 1) - value(x, y - 1)) * 0.5;
      pixels[i * 4] = Math.round(h * 255);
      pixels[i * 4 + 1] = Math.round((dx * 0.5 + 0.5) * 255);
      pixels[i * 4 + 2] = Math.round((dy * 0.5 + 0.5) * 255);
      pixels[i * 4 + 3] = coverage[i];
    }
  return { pixels, width, height, mode };
}
