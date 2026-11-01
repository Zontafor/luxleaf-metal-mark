import { recordCanvas } from "./recording.js";
export function drawPreview(
  source: HTMLCanvasElement,
  output: HTMLCanvasElement,
  background: string,
) {
  if (background !== "gradient" && !/^#[0-9a-f]{6}$/i.test(background))
    throw Error("Invalid preview background");
  if (output.width !== source.width) output.width = source.width;
  if (output.height !== source.height) output.height = source.height;
  const ctx = output.getContext("2d");
  if (!ctx) throw Error("Canvas export unavailable");
  if (background === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, 0, output.height);
    gradient.addColorStop(0, "#efefef");
    gradient.addColorStop(1, "#b8b8b8");
    ctx.fillStyle = gradient;
  } else ctx.fillStyle = background;
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(source, 0, 0);
}
export async function exportPreviewPNG(
  source: HTMLCanvasElement,
  background: string,
): Promise<Blob> {
  const output = document.createElement("canvas");
  drawPreview(source, output, background);
  return new Promise((resolve, reject) =>
    output.toBlob(
      (blob) => (blob ? resolve(blob) : reject(Error("PNG export failed"))),
      "image/png",
    ),
  );
}
export async function recordPreview(
  source: HTMLCanvasElement,
  background: string,
  seconds = 10,
): Promise<Blob> {
  if (document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches)
    throw Error("Keep the preview visible and enable motion to record");
  const output = document.createElement("canvas");
  let frame = 0;
  const abort = new AbortController();
  const visibility = () => {
    if (document.hidden) abort.abort();
  };
  document.addEventListener("visibilitychange", visibility);
  const draw = () => {
    drawPreview(source, output, background);
    frame = requestAnimationFrame(draw);
  };
  draw();
  try {
    return await recordCanvas(output, {
      seconds,
      fps: 30,
      signal: abort.signal,
    });
  } finally {
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", visibility);
  }
}
