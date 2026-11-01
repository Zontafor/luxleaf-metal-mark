/** Prepare a silhouette without turning a flat image backdrop into reflective material. */
export function prepareLogo(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 4194304 ||
    rgba.length !== width * height * 4
  )
    throw Error("Invalid logo dimensions");
  const count = width * height;
  const alpha = new Uint8ClampedArray(count);
  let transparent = false;
  for (let i = 3; i < rgba.length; i += 4)
    if (rgba[i] < 250) {
      transparent = true;
      break;
    }
  let method: "alpha" | "flat-background" | "luminance" = "alpha";
  if (transparent) {
    for (let i = 0; i < count; i++) alpha[i] = rgba[i * 4 + 3];
  } else {
    const border: number[] = [];
    for (let x = 0; x < width; x++) {
      border.push(x, (height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
      border.push(y * width, y * width + width - 1);
    }
    const median = (xs: number[]) =>
      xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const bg = [0, 1, 2].map((c) => median(border.map((i) => rgba[i * 4 + c])));
    const distance = (i: number) =>
      Math.max(...bg.map((v, c) => Math.abs(rgba[i * 4 + c] - v)));
    const noise = border.map(distance).sort((a, b) => a - b)[
      Math.floor((border.length - 1) * 0.95)
    ];
    if (noise <= 12) {
      method = "flat-background";
      const distances = new Uint8Array(count),
        histogram = new Uint32Array(256);
      const floor = Math.max(3, noise + 2);
      let foreground = 0;
      for (let i = 0; i < count; i++) {
        const d = distance(i);
        distances[i] = d;
        if (d > floor) {
          histogram[d]++;
          foreground++;
        }
      }
      if (!foreground)
        throw Error("No visible logo found against the background");
      // Estimate an opaque foreground from the upper tail, excluding backdrop pixels.
      let accumulated = 0,
        solid = 255;
      for (let d = 0; d < 256; d++) {
        accumulated += histogram[d];
        if (accumulated >= foreground * 0.9) {
          solid = d;
          break;
        }
      }
      const range = Math.max(1, solid - floor);
      for (let i = 0; i < count; i++)
        alpha[i] = Math.round(
          255 * Math.max(0, Math.min(1, (distances[i] - floor) / range)),
        );
    } else {
      method = "luminance";
      for (let i = 0; i < count; i++)
        alpha[i] =
          255 -
          (0.2126 * rgba[i * 4] +
            0.7152 * rgba[i * 4 + 1] +
            0.0722 * rgba[i * 4 + 2]);
    }
  }
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (alpha[y * width + x] > 4) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right < left) throw Error("No visible logo found");
  const padding = Math.max(
    2,
    Math.ceil(Math.max(right - left + 1, bottom - top + 1) * 0.06),
  );
  const w = right - left + 1 + padding * 2,
    h = bottom - top + 1 + padding * 2;
  if (w * h > 4194304) throw Error("Prepared logo exceeds processing budget");
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++)
      pixels[((y - top + padding) * w + x - left + padding) * 4 + 3] =
        alpha[y * width + x];
  return {
    pixels,
    width: w,
    height: h,
    method,
    bounds: { left, top, right, bottom },
  };
}
