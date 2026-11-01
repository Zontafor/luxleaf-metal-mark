import test from "node:test";
import assert from "node:assert/strict";
import {
  distanceField,
  processMask,
  validateProject,
  serializeProject,
  parseProject,
  projectLink,
  projectFromLink,
  ProjectHistory,
  defaults,
} from "../src/index.js";
test("distance field matches independent brute-force distances", () => {
  const w = 7,
    h = 5,
    mask = new Uint8Array(w * h);
  for (let y = 1; y < 4; y++) for (let x = 1; x < 6; x++) mask[y * w + x] = 1;
  const result = distanceField(mask, w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let expected = Math.min(x + 1, y + 1, w - x, h - y);
      for (let yy = 0; yy < h; yy++)
        for (let xx = 0; xx < w; xx++)
          if (!mask[yy * w + xx])
            expected = Math.min(expected, Math.hypot(x - xx, y - yy));
      assert.ok(Math.abs(result[y * w + x] - expected) < 1e-5);
    }
});
test("alpha masks preserve transparent holes and produce interior heights", () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  for (let y = 1; y < 4; y++)
    for (let x = 1; x < 4; x++) pixels[(y * 5 + x) * 4 + 3] = 255;
  const result = processMask(pixels, 5, 5, { bevel: 2 });
  assert.equal(result.mode, "alpha");
  assert.equal(result.pixels[3], 0);
  assert.equal(result.pixels[(2 * 5 + 2) * 4], 255);
  assert.equal(result.pixels[(2 * 5 + 2) * 4 + 3], 255);
});
test("opaque black logos on white use luminance with inversion available", () => {
  const pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
  assert.deepEqual(
    [...processMask(pixels, 2, 1).pixels].filter((_, i) => i % 4 === 3),
    [0, 255],
  );
  assert.deepEqual(
    [...processMask(pixels, 2, 1, { invert: true }).pixels].filter(
      (_, i) => i % 4 === 3,
    ),
    [255, 0],
  );
});
test("processing rejects invalid dimensions and unbounded parameters", () => {
  assert.throws(() => distanceField(new Uint8Array(3), 2, 2));
  assert.throws(() =>
    processMask(new Uint8ClampedArray(4), 1, 1, { bevel: Infinity }),
  );
  assert.throws(() =>
    processMask(new Uint8ClampedArray(4), 1, 1, { threshold: -1 }),
  );
});
test("projects and fragment shares round-trip without a remote store", () => {
  const p = validateProject({ version: 1, name: "Leaf", options: defaults });
  assert.deepEqual(parseProject(serializeProject(p)), p);
  assert.deepEqual(
    projectFromLink(projectLink(p, "https://example.test/workbench")),
    p,
  );
  assert.throws(() => projectLink(p, "javascript:alert(1)"));
});
test("project import rejects remote or executable media", () => {
  for (const logo of [
    "https://evil.test/logo",
    "data:image/svg+xml;base64,AAAA",
    "data:text/html;base64,AAAA",
  ])
    assert.throws(() =>
      validateProject({ version: 1, name: "x", options: defaults, logo }),
    );
  assert.throws(() => parseProject("x".repeat(1_520_001)));
});
test("project history supports undo redo and branch isolation", () => {
  const p = validateProject({ version: 1, name: "Leaf", options: defaults }),
    h = new ProjectHistory(p);
  h.commit({ ...p, name: "Gold" });
  assert.equal(h.undo().name, "Leaf");
  assert.equal(h.redo().name, "Gold");
  h.undo();
  h.commit({ ...p, name: "Silver" });
  assert.equal(h.redo().name, "Silver");
});
