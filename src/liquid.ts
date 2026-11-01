// Independently authored LuxLeaf implementation. No Paper implementation code or assets used.
// Copyright 2026 Michelle L. Wu. See docs/REFERENCE_BEHAVIOR.md for the public behavioral specification.
import { Surface } from "./surface.js";
import { buildRelief } from "./relief.js";
import { liquidFragment } from "./liquid-shader.js";
import { decodeSVG } from "./svg.js";
export interface LiquidSettings {
  refraction: number;
  edge: number;
  patternBlur: number;
  liquify: number;
  speed: number;
  patternScale: number;
}
export const liquidDefaults: Readonly<LiquidSettings> = Object.freeze({
  refraction: 0.015,
  edge: 0.4,
  patternBlur: 0.005,
  liquify: 0.07,
  speed: 0.3,
  patternScale: 2,
});
/** Ranges are LuxLeaf bounds. Only displayed defaults, not upstream range limits, were observable. */
export const liquidRanges: Record<
  keyof LiquidSettings,
  readonly [number, number, number]
> = {
  refraction: [0, 0.06, 0.001],
  edge: [0, 1, 0.001],
  patternBlur: [0, 0.05, 0.001],
  liquify: [0, 0.4, 0.001],
  speed: [0, 1, 0.001],
  patternScale: [0.1, 10, 0.1],
};
export function validateLiquid(value: unknown): LiquidSettings {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Liquid settings object required");
  const result = { ...liquidDefaults };
  for (const [key, value_] of Object.entries(value)) {
    if (!(key in liquidRanges)) throw Error("Unknown liquid setting: " + key);
    const [min, max] = liquidRanges[key as keyof LiquidSettings];
    if (
      typeof value_ !== "number" ||
      !Number.isFinite(value_) ||
      value_ < min ||
      value_ > max
    )
      throw Error("Invalid " + key);
    result[key as keyof LiquidSettings] = value_;
  }
  return result;
}
export type LiquidExample =
  "leaf" | "circle" | "diamond" | "star" | "ring" | "wave";
export const liquidExamples: LiquidExample[] = [
  "leaf",
  "circle",
  "diamond",
  "star",
  "ring",
  "wave",
];
export function exampleSVG(shape: LiquidExample) {
  if (!liquidExamples.includes(shape)) throw Error("Unknown example");
  const paths: Record<LiquidExample, string> = {
    leaf: '<path d="M30 175C20 70 105 15 180 20C190 115 120 190 30 175Z"/><path fill="white" d="M30 175L150 55L45 180Z"/>',
    circle: '<circle cx="100" cy="100" r="77"/>',
    diamond: '<path d="M100 15L185 100L100 185L15 100Z"/>',
    star: '<path d="M100 12L125 70L190 76L140 120L156 184L100 150L44 184L60 120L10 76L75 70Z"/>',
    ring: '<path fill-rule="evenodd" d="M100 15A85 85 0 1 0 100 185A85 85 0 1 0 100 15M100 58A42 42 0 1 1 100 142A42 42 0 1 1 100 58"/>',
    wave: '<path d="M15 80C50 10 80 145 120 75C150 20 175 45 190 80L190 120C150 70 145 180 110 130C60 60 50 180 15 120Z"/>',
  };
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><g fill="black">' +
    paths[shape] +
    "</g></svg>"
  );
}

export class LiquidMark {
  readonly surface: Surface;
  private settings: LiquidSettings;
  private generation = 0;
  private dead = false;
  private logo = "";
  constructor(
    canvas: HTMLCanvasElement,
    settings: Partial<LiquidSettings> = {},
  ) {
    this.settings = validateLiquid(settings);
    this.surface = new Surface(canvas, liquidFragment);
    if (this.surface.status !== "ready") {
      this.surface.destroy();
      throw Error(
        "WebGL2 is unavailable; this browser cannot render the liquid effect",
      );
    }
    this.update(settings);
  }
  update(settings: Partial<LiquidSettings>) {
    if (this.dead) throw Error("Renderer disposed");
    this.settings = validateLiquid({ ...this.settings, ...settings });
    const s = this.settings;
    this.surface.set({
      uRefraction: s.refraction,
      uEdge: s.edge,
      uPatternBlur: s.patternBlur,
      uLiquify: s.liquify,
      uSpeed: s.speed,
      uPatternScale: s.patternScale,
    });
    this.surface.play(s.speed > 0);
  }
  private apply(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d")!,
      rgba = context.getImageData(0, 0, canvas.width, canvas.height);
    const mask = buildRelief(rgba.data, canvas.width, canvas.height, {
      mode: "auto",
    });
    this.logo = canvas.toDataURL();
    this.surface.setLinearField(mask.field, canvas.width, canvas.height);
    this.surface.set({ uImageSize: [canvas.width, canvas.height] });
  }
  async loadSVG(source: string) {
    if (this.dead) throw Error("Renderer disposed");
    const ticket = ++this.generation;
    const canvas = await decodeSVG(source);
    if (!this.dead && ticket === this.generation) this.apply(canvas);
  }
  async load(file: File) {
    if (this.dead) throw Error("Renderer disposed");
    if (file.size < 1 || file.size > 8 * 1024 * 1024)
      throw Error("Use an image under 8 MiB");
    const ticket = ++this.generation;
    if (file.type === "image/svg+xml") {
      const source = await file.text();
      if (this.dead || ticket !== this.generation) return;
      const canvas = await decodeSVG(source);
      if (!this.dead && ticket === this.generation) this.apply(canvas);
      return;
    }
    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type))
      throw Error("Use SVG, PNG, WebP or JPEG");
    const bitmap = await createImageBitmap(file);
    try {
      if (this.dead || ticket !== this.generation) return;
      if (bitmap.width > 4096 || bitmap.height > 4096)
        throw Error("Image exceeds 4096 pixels");
      const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      this.apply(canvas);
    } finally {
      bitmap.close();
    }
  }
  async example(shape: LiquidExample) {
    await this.loadSVG(exampleSVG(shape));
  }
  exportLogo() {
    if (!this.logo) throw Error("No logo loaded");
    return this.logo;
  }
  exportPNG() {
    return this.surface.exportPNG();
  }
  destroy() {
    if (this.dead) return;
    this.dead = true;
    ++this.generation;
    this.surface.destroy();
  }
}
export interface LiquidProject {
  version: 1;
  kind: "liquid-logo";
  settings: LiquidSettings;
  background: string;
  logo: string;
}
export function validateLiquidProject(value: unknown): LiquidProject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Project required");
  const x = value as Record<string, unknown>;
  if (
    Object.keys(x).some(
      (k) => !["version", "kind", "settings", "background", "logo"].includes(k),
    ) ||
    x.version !== 1 ||
    x.kind !== "liquid-logo"
  )
    throw Error("Unknown project format");
  if (
    typeof x.background !== "string" ||
    !(x.background === "gradient" || /^#[0-9a-f]{6}$/i.test(x.background))
  )
    throw Error("Invalid background");
  if (
    typeof x.logo !== "string" ||
    x.logo.length > 1500000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(x.logo)
  )
    throw Error("Invalid embedded logo");
  return {
    version: 1,
    kind: "liquid-logo",
    settings: validateLiquid(x.settings),
    background: x.background,
    logo: x.logo,
  };
}
export function liquidShare(project: LiquidProject, base: string) {
  const value = JSON.stringify(validateLiquidProject(project));
  if (value.length > 64000) throw Error("Use a project file for this image");
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol))
    throw Error("HTTP URL required");
  url.hash = "liquid=" + encodeURIComponent(value);
  return url.href;
}
export function liquidFromShare(link: string) {
  const url = new URL(link);
  if (url.hash.length > 200000 || !url.hash.startsWith("#liquid="))
    throw Error("Invalid share link");
  return validateLiquidProject(
    JSON.parse(decodeURIComponent(url.hash.slice(8))),
  );
}
