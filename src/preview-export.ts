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
  signal?: AbortSignal,
): Promise<Blob> {
  if (document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches)
    throw Error("Keep the preview visible and enable motion to record");
  if (signal?.aborted) throw new DOMException("Recording cancelled", "AbortError");
  const output = document.createElement("canvas");
  const width = source.width, height = source.height;
  let frame = 0;
  let renderError: unknown;
  const abort = new AbortController();
  const cancel = () => abort.abort();
  const visibility = () => {
    if (document.hidden) cancel();
  };
  const draw = () => {
    try {
      if (source.width !== width || source.height !== height)
        throw Error("Preview resized during recording. Record again at the new size.");
      drawPreview(source, output, background);
      frame = requestAnimationFrame(draw);
    } catch (error) {
      renderError = error;
      cancel();
    }
  };
  document.addEventListener("visibilitychange", visibility);
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    draw();
    return await recordCanvas(output, {
      seconds,
      fps: 30,
      signal: abort.signal,
    });
  } catch (error) {
    throw renderError ?? error;
  } finally {
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", visibility);
    signal?.removeEventListener("abort", cancel);
  }
}
