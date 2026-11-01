import {
  MetalMark,
  sanitizeSVG,
  recordCanvas,
  projectLink,
  projectFromLink,
  defaults,
} from "../src/index";
const output = document.querySelector("#result")!;
const lines: string[] = [];
function check(name: string, value: unknown) {
  if (!value) throw new Error(name);
  lines.push("PASS " + name);
  output.textContent = lines.join("\n");
}
const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
document.querySelector("#run")!.addEventListener("click", async () => {
  lines.length = 0;
  try {
    await run();
    output.textContent = lines.join("\n") + "\nALL PASSED: " + lines.length;
  } catch (error) {
    output.textContent = lines.join("\n") + "\nFAILED: " + String(error);
  }
});
async function run() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:320px;height:240px";
  document.body.append(canvas);
  const renderer = new MetalMark(canvas, { animate: false });
  try {
    check(
      "distance-field shader compiles",
      renderer.surface.status === "ready",
    );
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path fill="black" d="M10 50L50 10L90 50L50 90Z"/></svg>';
    await renderer.loadSVG(svg);
    check(
      "safe SVG rasterizes and becomes a local mask",
      renderer.exportLogo().startsWith("data:image/png;base64,"),
    );
    for (const malicious of [
      "<svg><script>alert(1)</script></svg>",
      '<svg><image href="https://example.com/a.png"/></svg>',
      '<svg><path style="fill:url(https://example.com)"/></svg>',
    ]) {
      let rejected = false;
      try {
        sanitizeSVG(malicious);
      } catch {
        rejected = true;
      }
      check("unsafe SVG resource rejected", rejected);
    }
    renderer.update({ angle: 80, edge: 2, chromatic: 0.5 });
    const image = await renderer.exportPNG();
    check(
      "processed logo exports a PNG",
      image.type === "image/png" && image.size > 100,
    );
    const project = {
      version: 1 as const,
      name: "Diamond",
      options: defaults,
      logo: renderer.exportLogo(),
    };
    check(
      "shared project retains original logo",
      projectFromLink(projectLink(project, location.href)).logo ===
        project.logo,
    );
    renderer.update({ animate: true });
    const video = await recordCanvas(canvas, { seconds: 0.4, fps: 10 });
    check(
      "actual MediaRecorder exports video",
      video.type.startsWith("video/webm") && video.size > 100,
    );
    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    try {
      await recordCanvas(canvas, { signal: controller.signal });
    } catch {
      aborted = true;
    }
    check("cancelled recording rejects cleanly", aborted);
    renderer.destroy();
    check(
      "renderer disposes after media work",
      renderer.surface.status === "disposed",
    );
  } finally {
    renderer.destroy();
    canvas.remove();
  }
}
