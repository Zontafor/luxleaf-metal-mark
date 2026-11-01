# Supported scope and comparison

This is a LuxLeaf product, not a renamed fork or drop-in upstream replacement. Similarity in purpose does not imply API, visual, performance or ecosystem parity.

| Capability | Implementation and evidence |
|---|---|
| Metal reflection treatment | Independently authored GLSL; real compilation and GPU output verified. |
| Logo import | Local PNG/WebP decoding, alpha mask, aspect fit; synthetic PNG import checked in browser. |
| Live controls and presets | Validated tint/speed/frequency/distortion/contrast, JSON round trips. |
| PNG export | Actual image/png Blob checked; transparent mask used in shader. |
| SVG/vector ingestion, edge-distance processing | Not implemented. |
| Video export or a hosted logo service | Not implemented. |
| Liquid Logo code or pixel/API parity | Not included or claimed. |

## Release acceptance

A v0.1 release requires passing type checks, unit tests, production build, package-content review, a fresh package consumer import and the documented browser checks. The private repository must contain source, demo, lockfile, CI, notices and architecture documentation. A release tag must point to the reviewed source commit.

## Before a broader production rollout

Validate the host application's accessibility and authorization independently. Test the actual target Chrome, Safari, Firefox, mobile and GPU fleet. Establish measured frame-time and memory budgets under intended concurrency. Add browser checks to the organization's browser CI infrastructure. No load/SLA, cross-browser certification, independent security audit or exact upstream parity is claimed by this initial release.
