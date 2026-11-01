import { buildRelief } from "./relief.js";
/** Keep the established luminance-derived chrome normals, but shade the whole image.
 * Luminance affects relief only; it must not erase bright areas of an opaque photo.
 * This is an artistic relief interpretation, not physical depth reconstruction.
 */
export function buildImageRelief(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const relief = buildRelief(rgba, width, height, { mode: "luminance" });
  for (let i = 0; i < width * height; i++)
    relief.field[i * 4 + 3] = rgba[i * 4 + 3] / 255;
  return { field: relief.field, width, height };
}
