import type { ArtworkMode, LiquidSettings } from "../src/liquid";
/** User-selected settings captured from the live editor on 2026-11-01. */
export const aulinDemo = Object.freeze({
  inputMode: "cutout" as ArtworkMode,
  background: "gradient",
  settings: Object.freeze<LiquidSettings>({
    refraction: 0.015, edge: 0.661, patternBlur: 0.05,
    liquify: 0.4, speed: 1, patternScale: 10,
  }),
});
