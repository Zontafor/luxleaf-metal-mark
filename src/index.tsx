import React, { useEffect, useRef } from "react";
import { Surface } from "./surface.js";
import {
  number,
  color,
  rgb,
  object,
  boolean,
  parseJSON,
} from "./validation.js";
export interface MetalOptions {
  color: string;
  speed: number;
  frequency: number;
  distortion: number;
  contrast: number;
  animate: boolean;
}
export const defaults: MetalOptions = {
  color: "#c6d9cb",
  speed: 0.3,
  frequency: 7,
  distortion: 0.6,
  contrast: 1.2,
  animate: true,
};
export function validate(value: unknown): MetalOptions {
  const v = {
    ...defaults,
    ...object(value, [
      "color",
      "speed",
      "frequency",
      "distortion",
      "contrast",
      "animate",
    ]),
  };
  return {
    color: color(v.color),
    speed: number(v.speed, "speed", 0, 2),
    frequency: number(v.frequency, "frequency", 1, 20),
    distortion: number(v.distortion, "distortion", 0, 2),
    contrast: number(v.contrast, "contrast", 0.3, 3),
    animate: boolean(v.animate),
  };
}
export function serialize(options: MetalOptions) {
  return JSON.stringify(validate(options));
}
export function deserialize(text: string) {
  return validate(parseJSON(text));
}
export function validateImageFile(file: Pick<File, "size" | "type">) {
  if (
    !["image/png", "image/webp"].includes(file.type) ||
    file.size < 1 ||
    file.size > 8 * 1024 * 1024
  )
    throw new Error("Use a PNG or WebP under 8 MiB");
}
const fragment = `#version 300 es
precision highp float;in vec2 uv;out vec4 frag;uniform sampler2D uImage;uniform vec2 uResolution,uImageSize;uniform vec3 uColor;uniform float uTime,uSpeed,uFrequency,uDistortion,uContrast;
void main(){vec2 p=uv-.5;float frame=uResolution.x/uResolution.y,asset=uImageSize.x/uImageSize.y;vec2 fit=frame>asset?vec2(asset/frame,1.):vec2(1.,frame/asset);vec2 sampleUV=p/fit+.5;float mask=texture(uImage,clamp(sampleUV,0.,1.)).a;if(any(lessThan(sampleUV,vec2(0.)))||any(greaterThan(sampleUV,vec2(1.))))mask=0.;float t=uTime*uSpeed;float bend=sin(p.y*9.+t)*uDistortion*.25+cos(p.x*7.-t*.8)*uDistortion*.2;float bands=.5+.5*sin((p.x+p.y*.6+bend)*uFrequency+t);float shine=pow(bands,3.);float dark=pow(1.-bands,5.);vec3 metal=uColor*(.25+shine*1.25)+vec3(.1,.16,.2)*(1.-bands)-dark*.16;metal=(metal-.5)*uContrast+.5;frag=vec4(clamp(metal,0.,1.),mask);}`;
export class MetalMark {
  readonly surface: Surface;
  private options: MetalOptions;
  private generation = 0;
  private dead = false;
  private fallback = "";
  private originalBackground: string;
  private showFallback = () => {
    this.surface.canvas.style.background =
      this.surface.status === "ready"
        ? this.originalBackground
        : `center / contain no-repeat url("${this.fallback}")`;
  };
  constructor(canvas: HTMLCanvasElement, options: Partial<MetalOptions> = {}) {
    this.options = validate(options);
    this.originalBackground = canvas.style.background;
    this.surface = new Surface(canvas, fragment);
    canvas.addEventListener("webglcontextlost", this.showFallback);
    canvas.addEventListener("webglcontextrestored", this.showFallback);
    this.surface.set({ uImageSize: [1, 1] });
    this.update(this.options);
    const initial = document.createElement("canvas");
    initial.width = initial.height = 512;
    const c = initial.getContext("2d")!;
    c.fillStyle = "white";
    c.translate(256, 256);
    c.beginPath();
    c.ellipse(0, 0, 160, 75, -Math.PI / 4, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = "destination-out";
    c.lineWidth = 13;
    c.beginPath();
    c.moveTo(-110, 110);
    c.lineTo(110, -110);
    c.stroke();
    this.fallback = initial.toDataURL();
    this.showFallback();
    this.surface.setImage(initial);
    this.surface.set({ uImageSize: [512, 512] });
  }
  update(options: Partial<MetalOptions>) {
    this.options = validate({ ...this.options, ...options });
    const o = this.options;
    this.surface.set({
      uColor: rgb(o.color),
      uSpeed: o.speed,
      uFrequency: o.frequency,
      uDistortion: o.distortion,
      uContrast: o.contrast,
    });
    this.surface.play(o.animate);
  }
  async load(file: File) {
    if (this.dead) throw new Error("Renderer disposed");
    validateImageFile(file);
    const generation = ++this.generation;
    const image = await createImageBitmap(file);
    try {
      if (this.dead || generation !== this.generation) return;
      if (image.width > 4096 || image.height > 4096)
        throw new Error("Image dimensions exceed 4096 pixels");
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d")!.drawImage(image, 0, 0);
      this.fallback = canvas.toDataURL();
      this.showFallback();
      this.surface.setImage(canvas);
      this.surface.set({ uImageSize: [image.width, image.height] });
    } finally {
      image.close();
    }
  }
  exportPNG() {
    return this.surface.exportPNG();
  }
  destroy() {
    this.dead = true;
    this.generation++;
    this.surface.canvas.removeEventListener(
      "webglcontextlost",
      this.showFallback,
    );
    this.surface.canvas.removeEventListener(
      "webglcontextrestored",
      this.showFallback,
    );
    this.surface.canvas.style.background = this.originalBackground;
    this.surface.destroy();
  }
}
export function MetalCanvas({
  options = {},
  onReady,
  ...props
}: {
  options?: Partial<MetalOptions>;
  onReady?: (renderer: MetalMark | null) => void;
} & React.CanvasHTMLAttributes<HTMLCanvasElement>) {
  const ref = useRef<HTMLCanvasElement>(null),
    instance = useRef<MetalMark | null>(null),
    ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    const renderer = new MetalMark(ref.current!, options);
    instance.current = renderer;
    ready.current?.(renderer);
    return () => {
      renderer.destroy();
      instance.current = null;
      ready.current?.(null);
    };
  }, []);
  useEffect(() => {
    instance.current?.update(options);
  }, [JSON.stringify(options)]);
  return (
    <canvas
      {...props}
      ref={ref}
      role="img"
      aria-label={props["aria-label"] ?? "Animated metal logo"}
    />
  );
}
