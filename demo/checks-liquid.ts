import {
  LiquidMark,
  liquidDefaults,
  liquidExamples,
  liquidShare,
  liquidFromShare,
} from "../src/liquid";
import { drawPreview, exportPreviewPNG } from "../src/preview-export";
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
        pixels,
      );
      check(
        shape + " renders colored and transparent pixels",
        new Set(pixels).size > 12 &&
          pixels.some((x, i) => i % 4 === 3 && x === 0) &&
          pixels.some((x, i) => i % 4 === 3 && x > 0),
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
          a,
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
        read().some((v, i) => v !== before[i]),
      );
    }
    const svgFile = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="24"/></svg>',
      ],
      "own.svg",
      { type: "image/svg+xml" },
    );
    await r.load(svgFile);
    check(
      "uploaded SVG uses the independent decoder",
      r.exportLogo().startsWith("data:image/png;base64,"),
    );
    const png = await r.exportPNG();
    await r.load(new File([png], "own.png", { type: "image/png" }));
    check("exported PNG can be uploaded again", r.exportLogo().length > 100);
    const blob = await r.exportPNG();
    check(
      "PNG export contains rendered output",
      blob.type === "image/png" && blob.size > 100,
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
        JSON.stringify(project),
    );
    check("rendering has no WebGL errors", gl.getError() === gl.NO_ERROR);
    // Exercise the actual production GLSL helpers against independently evaluated CPU math.
    const opticalCanvas = document.createElement("canvas");
    opticalCanvas.style.cssText = "width:8px;height:8px";
    document.body.append(opticalCanvas);
    const opticalSurface = new Surface(
      opticalCanvas,
      liquidFragment.slice(0, liquidFragment.indexOf("vec3 studio")) +
        `
      uniform vec4 uProbe;
      void main(){frag=vec4(fresnel(uProbe.x,uProbe.y,uProbe.z),masking(uProbe.x,uProbe.w),0.,1.);}`,
    );
    try {
      const opticalGL = opticalCanvas.getContext("webgl2")!;
      let maxError = 0;
      for (const probe of [
        [1, 0.32, 3.4, 0.1],
        [0.5, 0.32, 3.4, 0.25],
        [0.02, 0.14, 2.8, 0.6],
        [0.8, 1.5, 0.5, 0.8],
      ]) {
        opticalSurface.set({ uProbe: probe });
        const pixel = new Uint8Array(4);
        opticalGL.readPixels(
          0,
          0,
          1,
          1,
          opticalGL.RGBA,
          opticalGL.UNSIGNED_BYTE,
          pixel,
        );
        maxError = Math.max(
          maxError,
          Math.abs(
            pixel[0] / 255 - conductorFresnel(probe[0], probe[1], probe[2]),
          ),
          Math.abs(pixel[1] / 255 - smithMask(probe[0], probe[3])),
        );
      }
      check(
        "production GPU Fresnel and masking agree with CPU within 2/255",
        opticalSurface.status === "ready" &&
          opticalGL.getError() === opticalGL.NO_ERROR &&
          maxError < 2 / 255,
      );
    } finally {
      opticalSurface.destroy();
      opticalCanvas.remove();
    }
    const precisionCanvas = document.createElement("canvas");
    precisionCanvas.style.cssText = "width:8px;height:8px";
    document.body.append(precisionCanvas);
    const precision = new Surface(
      precisionCanvas,
      `#version 300 es
      precision highp float; in vec2 uv; uniform sampler2D uImage; out vec4 frag;
      void main(){frag=vec4((texture(uImage,vec2(.25,.75)).g-.5)*256.,(texture(uImage,vec2(.25,.25)).g-.5)*256.,0.,1.);}`,
    );
    try {
      const values = new Float32Array(16).fill(0.5);
      values[1] = 0.5005;
      values[9] = 0.5015;
      for (let i = 3; i < 16; i += 4) values[i] = 1;
      precision.setLinearField(values, 2, 2);
      const pgl = precisionCanvas.getContext("webgl2")!,
        pixel = new Uint8Array(4);
      const readPrecision = () => {
        pgl.readPixels(0, 0, 1, 1, pgl.RGBA, pgl.UNSIGNED_BYTE, pixel);
        return (
          pixel[0] > 25 &&
          pixel[0] < 40 &&
          pixel[1] > 85 &&
          pixel[1] < 105 &&
          pgl.getError() === pgl.NO_ERROR
        );
      };
      check(
        "half-float normals preserve sub-byte detail and top/bottom orientation",
        readPrecision(),
      );
      const loss = pgl.getExtension("WEBGL_lose_context");
      if (!loss) throw Error("Context loss test extension unavailable");
      const event = (name: string) =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(Error("Timed out: " + name)),
            5000,
          );
          precisionCanvas.addEventListener(
            name,
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
      const lost = event("webglcontextlost");
      loss.loseContext();
      await lost;
      const restored = event("webglcontextrestored");
      // Return from the loss-event dispatch before requesting restoration.
      await new Promise((resolve) => setTimeout(resolve, 100));
      loss.restoreContext();
      await restored;
      precision.set({});
      check(
        "context restoration recovers the floating-point relief texture",
        readPrecision(),
      );
    } finally {
      precision.destroy();
      precisionCanvas.remove();
    }
    const sentileaf = await fetch("/sentileaf.png");
    if (!sentileaf.ok) throw Error("SentiLeaf fixture unavailable");
    await r.load(
      new File([await sentileaf.blob()], "sentileaf.png", {
        type: "image/png",
      }),
    );
    const composite = document.createElement("canvas");
    drawPreview(canvas, composite, "#123456");
    const context = composite.getContext("2d")!,
      corner = context.getImageData(1, 1, 1, 1).data;
    check(
      "SentiLeaf has no reflective backdrop and exports the chosen solid background",
      corner[0] === 18 &&
        corner[1] === 52 &&
        corner[2] === 86 &&
        corner[3] === 255,
    );
    drawPreview(canvas, composite, "gradient");
    const topPixel = context.getImageData(1, 1, 1, 1).data,
      bottomPixel = context.getImageData(1, composite.height - 2, 1, 1).data;
    check(
      "gradient export retains opaque top and bottom backdrop colors",
      topPixel[0] > 235 &&
        bottomPixel[0] < 190 &&
        topPixel[3] === 255 &&
        bottomPixel[3] === 255,
    );
    check(
      "composited PNG export produces an actual image",
      (await exportPreviewPNG(canvas, "#ffffff")).size > 100,
    );
    const artwork = await fetch("/aulin_leather.png");
    if (!artwork.ok) throw Error("AULIN fixture unavailable");
    const artworkBlob = await artwork.blob();
    r.setInputMode("relief");
    await r.load(new File([artworkBlob], "aulin.png", { type: "image/png" }));
    const opaque = read();
    let opaqueInterior = true;
    for (
      let y = Math.floor(canvas.height * 0.32);
      y < canvas.height * 0.68;
      y += 7
    )
      for (
        let x = Math.floor(canvas.width * 0.2);
        x < canvas.width * 0.8;
        x += 7
      )
        if (opaque[(y * canvas.width + x) * 4 + 3] !== 255)
          opaqueInterior = false;
    check(
      "AULIN full-image relief shades every sampled interior pixel opaquely",
      opaqueInterior && r.artworkTreatment === "relief",
    );
    r.update({ liquify: 0 });
    const still = read();
    r.update({ liquify: 0.14 });
    const flowing = read();
    let regions = 0;
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      let change = 0;
      const x0 = quadrant % 2 ? 0.5 : 0.2,
        x1 = quadrant % 2 ? 0.8 : 0.5,
        y0 = quadrant < 2 ? 0.32 : 0.5,
        y1 = quadrant < 2 ? 0.5 : 0.68;
      for (
        let y = Math.floor(canvas.height * y0);
        y < canvas.height * y1;
        y += 4
      )
        for (
          let x = Math.floor(canvas.width * x0);
          x < canvas.width * x1;
          x += 4
        ) {
          const i = (y * canvas.width + x) * 4;
          change += Math.abs(still[i] - flowing[i]);
        }
      if (change > 100) regions++;
    }
    check(
      "liquid deformation changes all four regions of the AULIN surface",
      regions === 4,
    );
    r.setInputMode("cutout");
    check(
      "previous AULIN cutout appearance remains available",
      r.artworkTreatment === "cutout" &&
        read().some((v, i) => i % 4 === 3 && v > 0 && v < 245),
    );
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
