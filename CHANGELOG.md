# Changelog

## Unreleased — behavior parity

- Add an independent liquid renderer and editor with the six observed controls and defaults.
- Add background selection, image intake, original sample shapes and portable liquid projects.
- Retain the previous API and studio; document the distinct project schemas.
- Do not claim exact pixel or original server API equivalence.

## 0.2.0 — 2026-11-01

- Original implementation: No Paper Design source, shader or assets are included. This package is independently implemented; it is not an exact recreation or API-compatible fork of that restricted product.
- Image pipeline: Linear-time distance transform, alpha/luminance masks, bevel normals, bounded local PNG/WebP decoding, and a geometry-only SVG sanitizer/rasterizer.
- Studio and persistence: Directional metal reflections, edge/chromatic controls, PNG and WebM exports, portable embedded-logo projects, undo/redo, bounded fragment sharing, authenticated SQLite project CRUD with expiry and opt-in public reads.
- Add source-inclusive package archives, foundation hash checks, and GitHub Packages publishing/consumer installation workflows.

## 0.1.0

Initial limited workbench release. It did not establish complete upstream parity.
