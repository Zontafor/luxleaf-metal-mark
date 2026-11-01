import test from "node:test";
import assert from "node:assert/strict";
import {
  conductorFresnel,
  conductorBRDF,
  normalize,
  reflect,
  dot,
} from "../src/optics.js";
import { buildRelief } from "../src/relief.js";
const close = (a: number, b: number, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
test("reflection preserves ray length and reverses its normal component", () => {
  const normal = normalize([0.3, 0.2, 1]);
  for (const ray of [
    [0, 0, -1],
    [0.5, 0.2, -1],
    [-0.7, 0.4, -0.2],
  ] as const) {
    const incident = normalize(ray),
      out = reflect(incident, normal);
    close(Math.hypot(...out), 1);
    close(dot(out, normal), -dot(incident, normal));
  }
});
test("complex conductor Fresnel agrees with the analytic normal-incidence limit", () => {
  for (const [eta, k] of [
    [0.2, 3.4],
    [1.5, 0],
    [0.8, 2.2],
  ])
    close(
      conductorFresnel(1, eta, k),
      ((eta - 1) ** 2 + k * k) / ((eta + 1) ** 2 + k * k)
    );
  close(conductorFresnel(0, 0.2, 3.4), 1);
  close(conductorFresnel(0.3, 1, 0), 0);
  for (let i = 0; i <= 100; i++) {
    const f = conductorFresnel(i / 100, 0.2, 3.4);
    assert.ok(f >= 0 && f <= 1);
  }
  assert.throws(() => conductorFresnel(NaN, 0.2, 3.4));
  assert.throws(() => conductorFresnel(0.5, -1, 3.4));
});
test("GGX conductor BRDF is reciprocal, finite and excludes backfaces", () => {
  for (const roughness of [0.1, 0.35, 0.8])
    for (const v of [
      [0, 0, 1],
      [0.8, 0, 0.6],
    ] as const)
      for (const l of [
        [0.2, 0.4, 1],
        [-0.7, 0, 0.8],
      ] as const) {
        const a = conductorBRDF(v, l, roughness),
          b = conductorBRDF(l, v, roughness);
        assert.ok(Number.isFinite(a) && a >= 0);
        close(a, b, 1e-9);
      }
  assert.equal(conductorBRDF([0, 0, 1], [0, 0, -1], 0.3), 0);
});
test("hemispherical reflected energy does not exceed incident energy", () => {
  // Independent solid-angle midpoint quadrature, not the renderer's GGX importance sampler.
  const nz = 256,
    nphi = 512;
  for (const roughness of [0.25, 0.5, 0.85])
    for (const cosine of [1, 0.5, 0.2]) {
      const v = [Math.sqrt(1 - cosine * cosine), 0, cosine] as const;
      let energy = 0;
      for (let z = 0; z < nz; z++) {
        const c = (z + 0.5) / nz,
          s = Math.sqrt(1 - c * c);
        for (let p = 0; p < nphi; p++) {
          const phi = ((p + 0.5) * 2 * Math.PI) / nphi;
          energy +=
            (conductorBRDF(
              v,
              [s * Math.cos(phi), s * Math.sin(phi), c],
              roughness
            ) *
              c *
              2 *
              Math.PI) /
            nphi /
            nz;
        }
      }
      assert.ok(
        energy > 0 && energy <= 1.005,
        `roughness=${roughness}, view=${cosine}: energy=${energy}`
      );
    }
});
function disk(size: number, hole = false) {
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
      rgba[(y * size + x) * 4 + 3] =
        d < size * 0.36 && (!hole || d > size * 0.13) ? 255 : 0;
    }
  return rgba;
}
test("rounded relief retains holes and gives outward, approximately resolution-independent normals", () => {
  const a = buildRelief(disk(64), 64, 64),
    b = buildRelief(disk(128), 128, 128);
  const normal = (
    pixels: Uint8ClampedArray,
    size: number,
    x: number,
    y: number
  ) => [
    (pixels[(y * size + x) * 4 + 1] / 255) * 2 - 1,
    (pixels[(y * size + x) * 4 + 2] / 255) * 2 - 1,
  ];
  const left = normal(a.pixels, 64, 16, 32),
    right = normal(a.pixels, 64, 47, 32),
    top = normal(a.pixels, 64, 32, 16);
  assert.ok(left[0] < -0.1 && right[0] > 0.1 && top[1] > 0.1);
  const large = normal(b.pixels, 128, 95, 64);
  close(right[0], large[0], 0.12);
  const ring = buildRelief(disk(64, true), 64, 64);
  assert.equal(ring.pixels[(32 * 64 + 32) * 4 + 3], 0);
  assert.equal(ring.pixels[(32 * 64 + 47) * 4 + 3], 255);
});
