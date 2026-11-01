export async function recordCanvas(
  canvas: HTMLCanvasElement,
  {
    seconds = 3,
    fps = 30,
    signal,
  }: { seconds?: number; fps?: number; signal?: AbortSignal } = {},
): Promise<Blob> {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    seconds > 15 ||
    !Number.isInteger(fps) ||
    fps < 1 ||
    fps > 60
  )
    throw new Error("Use 1–60 fps and at most 15 seconds");
  if (signal?.aborted)
    throw new DOMException("Recording cancelled", "AbortError");
  const mime = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find(
    (type) =>
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type),
  );
  if (!mime || !canvas.captureStream)
    throw new Error("Video recording unsupported");
  const stream = canvas.captureStream(fps);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime });
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    throw error;
  }
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    let cancelled = false,
      done = false;
    let timer: ReturnType<typeof setTimeout>;
    let watchdog: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      clearTimeout(watchdog);
      signal?.removeEventListener("abort", abort);
      stream.getTracks().forEach((t) => t.stop());
    };
    const abort = () => {
      if (done) return;
      cancelled = true;
      done = true;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } finally {
        cleanup();
        reject(new DOMException("Recording cancelled", "AbortError"));
      }
    };
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("Recording failed"));
    };
    recorder.onstop = () => {
      if (done) return;
      done = true;
      cleanup();
      if (cancelled)
        reject(new DOMException("Recording cancelled", "AbortError"));
      else if (chunks.length) resolve(new Blob(chunks, { type: mime }));
      else reject(new Error("Recorder produced no video frames"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      recorder.start(100);
      timer = setTimeout(() => recorder.stop(), seconds * 1000);
      watchdog = setTimeout(
        () => {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error("Video recorder did not finish"));
        },
        seconds * 1000 + 5000,
      );
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
