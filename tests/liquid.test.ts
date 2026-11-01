import test from "node:test";
import assert from "node:assert/strict";
import {
  liquidDefaults,
  liquidRanges,
  validateLiquid,
  exampleSVG,
  liquidExamples,
  validateLiquidProject,
  liquidShare,
  liquidFromShare,
} from "../src/liquid.js";
test("reference control names and observed defaults are preserved", () => {
  assert.deepEqual(validateLiquid({}), {
    refraction: 0.015,
    edge: 0.4,
    patternBlur: 0.005,
    liquify: 0.07,
    speed: 0.3,
    patternScale: 2,
  });
});
test("every independent control rejects nonfinite and out-of-range values", () => {
  for (const [key, [min, max]] of Object.entries(liquidRanges)) {
    assert.equal((validateLiquid({ [key]: min }) as any)[key], min);
    assert.equal((validateLiquid({ [key]: max }) as any)[key], max);
    assert.throws(() => validateLiquid({ [key]: NaN }));
    assert.throws(() => validateLiquid({ [key]: max + 1 }));
  }
  assert.throws(() => validateLiquid({ shader: "x" }));
});
test("original sample shapes have bounded geometry-only SVG markup", () => {
  for (const shape of liquidExamples) {
    const svg = exampleSVG(shape);
    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.length < 1000);
    assert.ok(!/script|href=|style=|image/.test(svg));
  }
});
test("liquid projects and links restore the logo and all controls", () => {
  const p = {
    version: 1 as const,
    kind: "liquid-logo" as const,
    settings: { ...liquidDefaults },
    background: "gradient",
    logo: "data:image/png;base64,AAAA",
  };
  assert.deepEqual(liquidFromShare(liquidShare(p, "https://example.com")), p);
  assert.throws(() => liquidShare(p, "javascript:alert(1)"));
  assert.throws(() =>
    validateLiquidProject({ ...p, logo: "https://example.com/private" })
  );
  assert.throws(() =>
    validateLiquidProject({ ...p, background: "url(https://example.com)" })
  );
});
