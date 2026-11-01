import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { recordPreview } from "../src/preview-export.js";

function recordingHarness(t: TestContext) {
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0, stoppedTracks = 0, drawCount = 0;
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const ctx = {
    fillStyle: "", fillRect() {},
    drawImage() { drawCount++; },
    createLinearGradient() { return { addColorStop() {} }; },
  };
  const output = {
    width: 64, height: 64, getContext: () => ctx,
    captureStream: () => ({ getTracks: () => [{ stop() { stoppedTracks++; } }] }),
  };
  class Recorder {
    static isTypeSupported() { return true; }
    state = "inactive";
    onstop?: () => void;
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.onstop?.(); }
  }
  const replacements = {
    document: Object.assign(doc, { createElement: () => output }),
    matchMedia: () => ({ matches: false }),
    MediaRecorder: Recorder,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: (n: number) => { frames.delete(n); },
  };
  for (const [key, value] of Object.entries(replacements)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => descriptor
      ? Object.defineProperty(globalThis, key, descriptor)
      : Reflect.deleteProperty(globalThis, key));
  }
  const added = t.mock.method(doc, "addEventListener");
  const removed = t.mock.method(doc, "removeEventListener");
  return {
    source: { width: 64, height: 64 } as HTMLCanvasElement, doc, ctx,
    nextFrame() {
      const [n, callback] = [...frames][0]; frames.delete(n); callback(16);
    },
    assertClean(expectedTracks: number) {
      assert.equal(frames.size, 0);
      assert.equal(stoppedTracks, expectedTracks);
      assert.equal(removed.mock.callCount(), added.mock.callCount());
    },
  };
}

test("initial compositor failure removes visibility listeners and animation work", async t => {
  const h = recordingHarness(t);
  await assert.rejects(recordPreview(h.source, "invalid"), /Invalid preview background/);
  h.assertClean(0);
});
test("resizing cancels capture without changing the output dimensions mid-video", async t => {
  const h = recordingHarness(t);
  const recording = recordPreview(h.source, "#ffffff");
  h.source.width = 128;
  h.nextFrame();
  await assert.rejects(recording, /Preview resized/);
  h.assertClean(1);
});
test("later compositor errors reject and release capture tracks", async t => {
  const h = recordingHarness(t);
  const recording = recordPreview(h.source, "gradient");
  h.ctx.drawImage = () => { throw Error("GPU frame unavailable"); };
  h.nextFrame();
  await assert.rejects(recording, /GPU frame unavailable/);
  h.assertClean(1);
});
test("user cancellation and tab hiding stop capture and clean up", async t => {
  for (const hidden of [false, true]) {
    await t.test(hidden ? "hidden tab" : "cancel button", async t => {
      const h = recordingHarness(t);
      const controller = new AbortController();
      const recording = recordPreview(h.source, "#000000", 10, controller.signal);
      if (hidden) { h.doc.hidden = true; h.doc.dispatchEvent(new Event("visibilitychange")); }
      else controller.abort();
      await assert.rejects(recording, { name: "AbortError" });
      h.assertClean(1);
    });
  }
});
