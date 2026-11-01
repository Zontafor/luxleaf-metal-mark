# Metal optics and realistic limits

This independent renderer replaces the earlier UV color bands with reflected lighting. Its purpose is a plausible metallic logo preview. It does not reproduce the reference shader or certify pixel equivalence.

## Rendering pipeline

1. The geometry-only SVG decoder or raster importer produces an alpha mask.
2. A coarse-to-fine Poisson solve (`−Δu = 1`, zero boundary) builds a rounded cap with height `2√u`. A small separable filter smooths raster boundaries before finite differences produce outward normals. The solve is capped at 256 pixels on its longest dimension; original-resolution alpha preserves silhouette coverage and holes. Normals are uploaded as linear RGBA16F data, avoiding the previous eight-bit quantization.
3. Three directional analytic height waves perturb the normal through their derivatives, without moving the logo silhouette. A continuous tangent basis avoids near-pole orientation jumps.
4. Reflected rays sample an analytic studio environment: soft rectangular panels, a ceiling strip, warm fill and hemispherical ambient illumination.
5. A GGX microfacet conductor model weights each reflected contribution using exact unpolarized complex-index Fresnel and separable Smith masking/shadowing. The integrator takes 48 deterministic importance samples per pixel.
6. Linear reflected radiance receives Reinhard display compression and sRGB encoding. Premultiplied alpha preserves the mask coverage when composited.

The BRDF is `F(V·H) D(N·H) G(N·V,N·L) / (4 (N·V) (N·L))`, with `H = normalize(V+L)` and GGX width `alpha = roughness²`. Back-facing view/light directions contribute zero. This is a single-scattering model; roughness can lose energy through unmodeled multiple scattering.

The theory is described in PBRT's [conductor reflection](https://pbr-book.org/4ed/Reflection_Models/Conductor_BRDF) and [microfacet roughness](https://pbr-book.org/4ed/Reflection_Models/Roughness_Using_Microfacet_Theory) chapters. Implementation code here was authored independently; no PBRT or Paper shader implementation was copied.

## Meaning of the six controls

Names and defaults preserve the observed interface. The mapping below is LuxLeaf's explicit implementation, not a claim about the reference internals. All UI values are dimensionless artistic parameters.

| Control | Current mapping | Physical interpretation |
|---|---|---|
| Refraction | RGB real index `eta = (0.14,0.16,0.13) + 12 × value`; extinction `k = (3.9,3.4,2.8)` | Changes conductor reflectance; there is no transmitted glass-like image |
| Edge | Normal lateral strength `0.3 + 2.5 × value` | Changes apparent relief slope |
| Pattern Blur | Roughness `clamp(0.08 + 8 × value, 0.05, 0.7)` | Spreads specular reflection |
| Liquify | Amplitude of analytic normal perturbation | Procedural deformation, not simulated fluid |
| Speed | Multiplier on elapsed animation time; zero pauses | Controls wave evolution |
| Pattern Scale | Angular width and spacing of studio light panels | Changes the reflected environment |

These optical constants were selected for appearance. They are not a measured dataset for silver, chrome, mercury or another named material.

## Evidence and reproducibility

`npm run verify` includes tests for unit reflected rays, the analytic normal-incidence Fresnel limit, grazing reflectance, finite bounded Fresnel values, BRDF reciprocity, back-face rejection, and relief normal orientation/resolution behavior. Independent hemisphere quadrature checks that reflected energy stays below incident energy for nine roughness/view-angle combinations (with a 0.5% numerical tolerance).

Open `/checks-liquid.html` and run its checks to compare the actual GPU Fresnel and Smith functions against CPU calculations at four parameter points, within two 8-bit channel increments. The browser suite also exercises each control, six shapes, upload, export, sharing, resource disposal and WebGL errors. Additional GPU checks verify sub-byte normal precision, row orientation and texture restoration after a deliberately lost context. This is a local Chromium check, not a cross-GPU certification.

## Remaining limits

- Forty-eight samples approximate the lighting integral. Very sharp lights and rough surfaces can show sampling structure; the CPU energy test does not prove every finite-sample GPU result energy conserving.
- Finite mask resolution and the 256-pixel geometry grid can soften very fine details. Half-float normals reduce banding but do not eliminate all discretization. Complex asymmetric logos need broader visual regression coverage.
- There is no volumetric refraction, self-occlusion, ray-traced cast shadow, spectral rendering or measured environment map.
- Motion does not solve mass conservation, viscosity, gravity or surface tension. A physically simulated liquid would require a separate dynamics model and validation.
- Exact reference pixels, timing, supported SVG coverage and original service compatibility remain unverified. The geometry decoder intentionally rejects executable and externally referenced SVG content.

## Implementation map

| File | Responsibility |
|---|---|
| [relief.ts](../src/relief.ts) | Rounded relief and normal encoding |
| [optics.ts](../src/optics.ts) | Testable reflection and conductor equations |
| [liquid-shader.ts](../src/liquid-shader.ts) | GPU lighting integration and display transform |
| [optics.test.ts](../tests/optics.test.ts) | Numerical invariants and energy quadrature |
| [checks-liquid.ts](../demo/checks-liquid.ts) | Actual WebGL behavior and CPU/GPU comparison |
