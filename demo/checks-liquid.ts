import {
  LiquidMark,
  liquidDefaults,
  liquidExamples,
  liquidShare,
  liquidFromShare,
} from "../src/liquid";
import { Surface } from "../src/surface";
import { liquidFragment } from "../src/liquid-shader";
import { conductorFresnel, smithMask } from "../src/optics";
const out = document.querySelector("#result")!;
document.querySelector("#run")!.addEventListener("click", async () => {
  const lines: string[] = [];
  const check = (name: string, ok: unknown) => {
    if (!ok) throw Error(name);
    lines.push("PASS " + name);
    out.textContent = lines.join("\n");
  };
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:320px;height:320px";
  document.body.append(canvas);
  const r = new LiquidMark(canvas, { speed: 0 });
  try {
    check("independent shader compiles", r.surface.status === "ready");
    const unsupported = document.createElement("canvas");
    Object.defineProperty(unsupported, "getContext", { value: () => null });
    let unsupportedRejected = false;
    try {
      new LiquidMark(unsupported);
    } catch (error) {
      unsupportedRejected = String(error).includes("WebGL2");
    }
    check("unsupported GPU reports an explicit error", unsupportedRejected);
    for (const shape of liquidExamples) {
      await r.example(shape);
      const gl = canvas.getContext("webgl2")!,
        pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(
        0,
        0,
        canvas.width,
        canvas.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );
      check(
        shape + " renders colored and transparent pixels",
        new Set(pixels).size > 12 &&
          pixels.some((x, i) => i % 4 === 3 && x === 0) &&
          pixels.some((x, i) => i % 4 === 3 && x > 0)
      );
    }
    const gl = canvas.getContext("webgl2")!,
      read = () => {
        const a = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(
          0,
          0,
          canvas.width,
          canvas.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          a
        );
        return a;
      };
    for (const [key, value] of Object.entries({
      refraction: 0.05,
      edge: 0.8,
      patternBlur: 0.04,
      liquify: 0.3,
      patternScale: 4,
    })) {
      r.update({ ...liquidDefaults, speed: 0 });
      const before = read();
      r.update({ [key]: value });
      check(
        key + " independently changes rendered output",
        read().some((v, i) => v !== before[i])
      );
    }
    const svgFile = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="24"/></svg>',
      ],
      "own.svg",
      { type: "image/svg+xml" }
    );
    await r.load(svgFile);
    check(
      "uploaded SVG uses the independent decoder",
      r.exportLogo().startsWith("data:image/png;base64,")
    );
    const png = await r.exportPNG();
    await r.load(new File([png], "own.png", { type: "image/png" }));
    check("exported PNG can be uploaded again", r.exportLogo().length > 100);
    const blob = await r.exportPNG();
    check(
      "PNG export contains rendered output",
      blob.type === "image/png" && blob.size > 100
    );
    // A share link is bounded; original vector intake yields a compact embedded PNG.
    await r.load(svgFile);
    const project = {
      version: 1 as const,
      kind: "liquid-logo" as const,
      settings: { ...liquidDefaults },
      background: "gradient",
      logo: r.exportLogo(),
    };
    check(
      "share retains logo and exact settings",
      JSON.stringify(liquidFromShare(liquidShare(project, location.href))) ===
        JSON.stringify(project)
    );
    check("rendering has no WebGL errors", gl.getError() === gl.NO_ERROR);
    // Exercise the actual production GLSL helpers against independently evaluated CPU math.
    const opticalCanvas = document.createElement("canvas");
    opticalCanvas.style.cssText = "width:8px;height:8px";
    document.body.append(opticalCanvas);
    const opticalSurface = new Surface(opticalCanvas,
      liquidFragment.slice(0, liquidFragment.indexOf("vec3 studio")) + `
      uniform vec4 uProbe;
      void main(){frag=vec4(fresnel(uProbe.x,uProbe.y,uProbe.z),masking(uProbe.x,uProbe.w),0.,1.);}`);
    try {
      const opticalGL = opticalCanvas.getContext("webgl2")!;
      let maxError = 0;
      for (const probe of [[1,.32,3.4,.1],[.5,.32,3.4,.25],[.02,.14,2.8,.6],[.8,1.5,.5,.8]]) {
        opticalSurface.set({uProbe:probe});
        const pixel = new Uint8Array(4);
        opticalGL.readPixels(0,0,1,1,opticalGL.RGBA,opticalGL.UNSIGNED_BYTE,pixel);
        maxError = Math.max(maxError,Math.abs(pixel[0]/255-conductorFresnel(probe[0],probe[1],probe[2])),
          Math.abs(pixel[1]/255-smithMask(probe[0],probe[3])));
      }
      check("production GPU Fresnel and masking agree with CPU within 2/255",
        opticalSurface.status === "ready" && opticalGL.getError() === opticalGL.NO_ERROR && maxError < 2/255);
    } finally {opticalSurface.destroy(); opticalCanvas.remove();}
    r.destroy();
    check("renderer releases resources", r.surface.status === "disposed");
    out.textContent = lines.join("\n") + "\nALL PASSED: " + lines.length;
  } catch (e) {
    out.textContent = lines.join("\n") + "\nFAILED: " + e;
  } finally {
    r.destroy();
    canvas.remove();
  }
});
