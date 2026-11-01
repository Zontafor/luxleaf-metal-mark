# LuxLeaf Metal Mark

An original local logo renderer with metallic reflections, alpha-mask import, live controls and transparent PNG export.

**Private v0.1.0 product release.** Original LuxLeaf code is proprietary to Michelle L. Wu. Licensed foundations retain their own rights. This is a functional initial product with an explicit supported scope; it is not a full replacement for the upstream ecosystem.

## Run the workbench

```sh
npm ci --ignore-scripts
npm run verify
npm run dev -- --port 4177
```

Use Node 22.12+ (Node 24 recommended). Open the local URL printed by Vite. The demo includes live settings, reset and preset import/export. GPU products also export PNG. Nothing is sent to a server by the demo. Vite binds to loopback by default.

## Use the private package

Build and create an installable archive:

```sh
npm run build
npm pack
# In an authorized consumer project:
npm install /absolute/path/to/luxleaf-metal-mark-0.1.0.tgz
```

ES modules and TypeScript declarations are included. This package is intentionally marked `private: true`; no public npm publication is configured. Use one compatible React installation in the consumer. Browser components must run on the client; construction of imperative renderers requires the DOM. A preset is data, not executable code.

```tsx
import { useRef } from 'react';
import { MetalCanvas, type MetalMark } from '@luxleaf/metal-mark';

export function LogoWorkbench() {
  const renderer = useRef<MetalMark | null>(null);
  return <>
    <MetalCanvas style={{ width: '100%', height: 420 }}
      onReady={value => { renderer.current = value; }} />
    <input type="file" accept="image/png,image/webp" onChange={async event => {
      const file = event.target.files?.[0];
      if (file && renderer.current) {
        try { await renderer.current.load(file); }
        catch (error) { console.error('Logo rejected', error); }
      }
    }} />
  </>;
}
```

## API

| Export | Contract |
|---|---|
| `MetalCanvas` | React canvas component; `options`, `onReady(renderer or null)` and canvas attributes, including aria-label. |
| `new MetalMark(canvas, options)` | Imperative renderer, initially displaying an original generated leaf mask. |
| `load(file)` | Promise accepting PNG/WebP, 1 byte–8 MiB, decoded dimensions up to 4096 each. Latest load wins. |
| `update(partial)` | Merge and validate options before setting uniforms. |
| `exportPNG()` | Promise of image/png Blob with transparent space outside the mask; rejects if unavailable. |
| `destroy()` | Idempotent cleanup and cancellation of pending image application. |
| `surface.status` | `ready`, `fallback`, `lost`, `disposed`; canvas `data-renderer` mirrors lifecycle. |
| `validateImageFile`, `validate`, `serialize`, `deserialize`, `defaults` | Input validation and JSON helpers. |

`MetalOptions`: color (six-digit hex), speed (0–2), frequency (1–20), distortion (0–2), contrast (0.3–3), animate (boolean). The logo's alpha channel supplies the mask; opaque backgrounds create a rectangular mask. Exported presets contain effect settings only, never image bytes. React cleans up on unmount; imperative consumers must call `destroy()`.

All numeric fields must be finite and in range. Unknown configuration keys are rejected, and JSON input is limited to 16 KiB. Presets use the v0.1 schema; there is no version-migration promise yet. Exported defaults should be treated as immutable.

## Quality and operations

`npm run verify` checks TypeScript, runs 7 unit tests and builds both library and demo. `/checks.html` exposes 8 actual browser integration assertions; open it in the local server and press **Run checks**. Browser checks are manual and are not represented as automated CI coverage. See [validation](docs/VALIDATION.md) for evidence and limits.

- [Architecture and lifecycle](docs/ARCHITECTURE.md)
- [Capability comparison and known gaps](docs/CAPABILITIES.md)
- [Private release procedure](docs/RELEASING.md)
- [Research and provenance](docs/PROVENANCE.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Security reporting and data handling](SECURITY.md)

The demo is a workbench for this package. Authentication, tenancy, persistence, payments and deployment infrastructure belong to the integrating application and are not supplied by this browser library.
