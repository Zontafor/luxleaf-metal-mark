import {
  LiquidMark,
  liquidDefaults,
  liquidExamples,
  liquidShare,
  liquidFromShare,
} from "../src/liquid";
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
