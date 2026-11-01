# LuxLeaf Metal Mark

Original distance-field logo rendering with SVG intake, portable projects and video export.

The `behavior-parity` branch adds an independently implemented liquid-logo editor. The latest published stable package remains **0.2.0**; these changes have not yet been released. Original LuxLeaf additions are proprietary to **Michelle L. Wu**. The included licensed foundations retain their own licenses and attribution. Public source visibility does not grant a license to LuxLeaf's proprietary additions.

## Workbench

```sh
npm ci --ignore-scripts
npm run verify
npm run verify:package
npm run dev
```

Use Node 24+. Open `/` for the six-control liquid editor, `/checks-liquid.html` for its browser checks, and `/advanced.html` for the previous studio. `/checks-expanded.html` continues to verify that studio. These pages run locally. Consumer applications must supply authentication, tenancy and deployment controls appropriate to their use.

## Install

The scoped package is `@zontafor/luxleaf-metal-mark`. GitHub Packages requires registry authentication even for public npm packages. Configure your own GitHub credential outside source control, then:

```sh
npm install @zontafor/luxleaf-metal-mark@0.2.0 --registry=https://npm.pkg.github.com
```

GitHub Release `.tgz` attachments provide a separate installable archive. A release attachment alone is not proof of registry publication. See [release procedure](docs/RELEASING.md) for verification commands and the distinction between repository and package visibility.

## Package entry points

| Import suffix | Distributed implementation |
|---|---|
| `.` | `./dist/index.js` |
| `./server` | `./dist/server.js` |

## Implemented scope

### Original implementation

No Paper Design source, shader or assets are included. This package is independently implemented; it is not an exact recreation or API-compatible fork of that restricted product.

### Image pipeline

Linear-time distance transform, alpha/luminance masks, bevel normals, bounded local PNG/WebP decoding, and a geometry-only SVG sanitizer/rasterizer.

### Studio and persistence

Directional metal reflections, edge/chromatic controls, PNG and WebM exports, portable embedded-logo projects, undo/redo, bounded fragment sharing, authenticated SQLite project CRUD with expiry and opt-in public reads.

### Remaining host verification

The server is a single-process reference adapter, not an enterprise tenant/auth system. Distributed storage, quotas, host rate limits, HTTPS deployment, independent security assessment and broad device/codec certification remain outside this release.

## Verification

The current suite includes **20 unit/integration tests**. The liquid browser page checks each spatial effect separately, all six example shapes, SVG/PNG intake, export, sharing and disposal. The previous expanded browser page contains **10 assertions**, run separately from headless CI. These counts describe specific checks, not proof of exact feature, pixel or performance parity with another product. See [validation](docs/VALIDATION.md) for evidence and known limits.

The repository includes source, tests, runnable examples, build configuration, architecture notes, dependency notices and release workflows. The npm archive includes source and examples alongside JavaScript and declarations. It intentionally excludes installed dependencies, credentials and local user media.

- [Capability matrix](docs/CAPABILITIES.md)
- [Architecture and lifecycle](docs/ARCHITECTURE.md)
- [Provenance](docs/PROVENANCE.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Security and supported deployment](SECURITY.md)

## Liquid editor API (unreleased)

```ts
import { LiquidMark, liquidDefaults } from '@zontafor/luxleaf-metal-mark';
const renderer = new LiquidMark(canvas, liquidDefaults);
await renderer.load(imageFile); // SVG, PNG, WebP, JPEG; bounded local decoding
renderer.update({ refraction: 0.015, edge: 0.4, patternBlur: 0.005,
  liquify: 0.07, speed: 0.3, patternScale: 2 });
const png = await renderer.exportPNG(); // transparent image; preview backdrop is CSS
renderer.destroy();
```

`liquidShare` and `liquidFromShare` round-trip a validated `LiquidProject` in a URL fragment. Large images use a project file. This schema is separate from the older SQLite `MetalProject` adapter; it is not accepted by that API. Original geometric examples replace third-party brand artwork. See [observed behavior and remaining differences](docs/REFERENCE_BEHAVIOR.md).
