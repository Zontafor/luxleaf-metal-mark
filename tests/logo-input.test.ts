import test from "node:test";
import assert from "node:assert/strict";
import { prepareLogo } from "../src/logo-input.js";
function image(bg: number[], fg: number[]) {
  const a = new Uint8ClampedArray(20 * 20 * 4);
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 20; x++)
      a.set(x >= 6 && x < 14 && y >= 7 && y < 13 ? fg : bg, (y * 20 + x) * 4);
  return a;
}
test("off-white background is removed, colored ink is opaque and margins are fitted", () => {
  const result = prepareLogo(
    image([247, 248, 240, 255], [20, 77, 68, 255]),
    20,
    20,
  );
  assert.equal(result.method, "flat-background");
  assert.deepEqual(result.bounds, { left: 6, top: 7, right: 13, bottom: 12 });
  assert.equal(result.width, 12);
  assert.equal(result.height, 10);
  assert.equal(result.pixels[3], 0);
  assert.equal(result.pixels[(3 * result.width + 3) * 4 + 3], 255);
});
test("light logos on dark backgrounds preserve holes and antialiased boundaries", () => {
  const a = image([18, 18, 18, 255], [230, 230, 230, 255]);
  a.set([18, 18, 18, 255], (9 * 20 + 9) * 4);
  a.set([124, 124, 124, 255], (7 * 20 + 6) * 4);
  const r = prepareLogo(a, 20, 20),
    at = (x: number, y: number) =>
      r.pixels[
        ((y - r.bounds.top + 2) * r.width + x - r.bounds.left + 2) * 4 + 3
      ];
  assert.equal(at(9, 9), 0);
  assert.ok(at(6, 7) > 110 && at(6, 7) < 140);
  assert.equal(at(10, 10), 255);
});
test("transparent artwork retains original partial coverage regardless of RGB color", () => {
  const a = image([255, 0, 0, 0], [255, 255, 255, 255]);
  a[(9 * 20 + 9) * 4 + 3] = 80;
  const r = prepareLogo(a, 20, 20);
  assert.equal(r.method, "alpha");
  assert.equal(r.pixels[((9 - 7 + 2) * r.width + 9 - 6 + 2) * 4 + 3], 80);
});
test("empty artwork and invalid dimensions produce actionable failures", () => {
  assert.throws(
    () =>
      prepareLogo(image([247, 248, 240, 255], [247, 248, 240, 255]), 20, 20),
    /No visible logo/,
  );
  assert.throws(
    () => prepareLogo(new Uint8ClampedArray(4), 0, 1),
    /Invalid logo/,
  );
});
