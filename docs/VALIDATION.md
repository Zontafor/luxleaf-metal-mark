# Validation record — 2026-11-01

Release candidate: 0.1.0. Local environment: macOS, Node 24.2.0, TypeScript 7.0.2, Vite 8.3.5.

| Layer | Evidence |
|---|---|
| Type contracts | `npm run typecheck`, strict TypeScript across library, demo and tests. |
| Unit behavior | 7 passing tests in `tests/contract.test.ts`; validated ranges, unknown-key rejection, malformed input and preset round trip. |
| Actual browser | 8 passing assertions through `/checks.html` in the desktop in-app browser. These exercise real DOM/GPU lifecycle, not mocked rendering. |
| Build | ESM and declaration output plus Vite production demo. |
| Private distribution | `npm pack`, reviewed archive contents, fresh consumer ESM import. |
| CI | The repository workflow repeats type checks, unit tests, builds and pack inspection on pushes and pull requests. See GitHub Actions for the actual run result. |

The browser test implementation is committed beside the demo and can be rerun. It is not automated in the CI workflow. Manual demo inspection confirms a rendered result and working controls; it does not establish cross-browser fidelity, accessibility conformance or performance under load. Motion preference, hidden-document, context-restoration and adversarial media cases require a broader device test campaign before public production use.

`npm ci --ignore-scripts` avoids dependency lifecycle hooks. Registry install reported no known vulnerabilities at review time; this is a point-in-time result, not a security guarantee. The dependency inventory is in `dependencies.json`.
