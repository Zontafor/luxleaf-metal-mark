# LuxLeaf Metal Mark

Original distance-field logo rendering with SVG intake, portable projects and video export.

Version **0.2.0** expands the initial workbench into a broader package. Original LuxLeaf additions are proprietary to **Michelle L. Wu**. The included licensed foundations retain their own licenses and attribution. Public source visibility does not grant a license to LuxLeaf's proprietary additions.

## Workbench

```sh
npm ci --ignore-scripts
npm run verify
npm run verify:package
npm run dev
```

Use Node 24+. Open `/advanced.html` for the expanded studio, `/` for the compact demonstration, and `/checks-expanded.html` for real browser acceptance checks. These pages run locally. Consumer applications must supply authentication, tenancy and deployment controls appropriate to their use.

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

The current suite includes **16 unit/integration tests**. The expanded browser page contains **10 assertions**, run separately from headless CI. These counts describe specific checks, not proof of exact feature, pixel or performance parity with another product. See [validation](docs/VALIDATION.md) for evidence and known limits.

The repository includes source, tests, runnable examples, build configuration, architecture notes, dependency notices and release workflows. The npm archive includes source and examples alongside JavaScript and declarations. It intentionally excludes installed dependencies, credentials and local user media.

- [Capability matrix](docs/CAPABILITIES.md)
- [Architecture and lifecycle](docs/ARCHITECTURE.md)
- [Provenance](docs/PROVENANCE.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Security and supported deployment](SECURITY.md)
