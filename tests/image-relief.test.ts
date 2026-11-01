import test from "node:test";
import assert from "node:assert/strict";
import { buildImageRelief } from "../src/image-relief.js";
import { buildRelief } from "../src/relief.js";
import { validateLiquidProject, liquidDefaults } from "../src/liquid.js";
test("full-image treatment preserves previous chrome normals and shades bright pixels", () => {
  const rgba = new Uint8ClampedArray(32 * 24 * 4);
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = x < 16 ? 30 : 245;
      rgba[i + 3] = 255;
    }
  const previous = buildRelief(rgba, 32, 24, { mode: "luminance" }),
    full = buildImageRelief(rgba, 32, 24);
  for (let i = 0; i < rgba.length; i++)
    if (i % 4 === 3) assert.equal(full.field[i], 1);
    else assert.equal(full.field[i], previous.field[i]);
  assert.ok(previous.field.some((v, i) => i % 4 === 3 && v < 0.1));
});
test("full-image treatment retains explicit source alpha and rejects invalid dimensions", () => {
  const rgba = new Uint8ClampedArray(8 * 8 * 4).fill(80);
  const r = buildImageRelief(rgba, 8, 8);
  assert.ok(Math.abs(r.field[3] - 80 / 255) < 1e-7);
  assert.throws(() => buildImageRelief(rgba, 8, 9));
});
test("artwork mode round-trips while legacy projects remain compatible", () => {
  const p = {
    version: 1,
    kind: "liquid-logo",
    settings: { ...liquidDefaults },
    background: "gradient",
    logo: "data:image/png;base64,AAAA",
  };
  assert.deepEqual(validateLiquidProject(p), p);
  for (const inputMode of ["auto", "cutout", "relief"])
    assert.equal(
      validateLiquidProject({ ...p, inputMode }).inputMode,
      inputMode,
    );
  assert.throws(() => validateLiquidProject({ ...p, inputMode: "arbitrary" }));
});
