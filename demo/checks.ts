import { MetalMark } from "../src/index";
const output = document.querySelector("#result")!;
document.querySelector("#run")!.addEventListener("click", async () => {
  const checks: string[] = [];
  const check = (name: string, passed: boolean) => {
    if (!passed) throw new Error(name);
    checks.push("PASS " + name);
  };
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:320px;height:200px";
  document.body.append(canvas);
  let renderer: MetalMark | undefined;
  try {
    renderer = new MetalMark(canvas, { animate: false });
    await new Promise(requestAnimationFrame);
    check("actual WebGL shader compiles", renderer.surface.status === "ready");
    const gl = canvas.getContext("webgl2")!;
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    check("render produces nonuniform pixels", new Set(pixels).size > 8);
    const png = await renderer.exportPNG();
    check(
      "PNG export produces image data",
      png.type === "image/png" && png.size > 100,
    );
    const before = new Uint8Array(pixels);
    await new Promise((resolve) => setTimeout(resolve, 60));
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
      "paused renderer stays unchanged",
      before.every((v, i) => v === pixels[i]),
    );
    const fixture = document.createElement("canvas");
    fixture.width = fixture.height = 32;
    fixture.getContext("2d")!.fillRect(8, 8, 16, 16);
    const blob = await new Promise<Blob>((resolve) =>
      fixture.toBlob((b) => resolve(b!)),
    );
    await renderer.load(
      new File([blob], "synthetic.png", { type: "image/png" }),
    );
    check(
      "local PNG import renders without upload",
      renderer.surface.status === "ready",
    );
    renderer.update({ speed: 1 });
    check(
      "updated uniforms leave GPU error free",
      gl.getError() === gl.NO_ERROR,
    );
    renderer.destroy();
    check(
      "dispose changes lifecycle state",
      String(renderer.surface.status) === "disposed",
    );
    let rejected = false;
    try {
      renderer.update({ speed: 0.2 });
    } catch {
      rejected = true;
    }
    check("disposed instance rejects updates", rejected);
    output.textContent = checks.join("\n") + "\nALL PASSED: " + checks.length;
  } catch (error) {
    output.textContent =
      checks.join("\n") + "\nFAILED: " + (error as Error).message;
  } finally {
    renderer?.destroy();
    canvas.remove();
  }
});
