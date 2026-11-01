# Validation — v0.2.0

Verification date: 2026-11-01. Node 24.2.0 on macOS; browser checks use the Codex in-app Chromium surface.

## Reproduce

```sh
npm ci --ignore-scripts
npm run verify
npm run verify:package
npm run dev
```

`verify` checks preserved foundation hashes where applicable, type checks the LuxLeaf code, runs 16 unit/integration tests and builds the library and workbenches. `verify:package` checks export paths and source/notices in the actual tarball, extracts it outside the source tree and imports supported JavaScript entries using the installed dependency tree. The publication workflow additionally installs the package from GitHub's registry into a fresh consumer directory.

Open `/checks-expanded.html` and press **Run expanded checks**. The 10 assertions exercise actual browser functionality. Browser checks are manually invoked, not silently counted as GitHub Actions coverage. The older `/checks.html` remains for regression coverage.

## Limits

Native mobile hosts, Figma/Framer editor hosts, all consumer bundlers, cross-browser pixel equivalence, accessibility audits, load/SLA budgets and independent security review have not all been validated. An upstream source inventory is not an upstream test run. A successful browser run on this machine does not certify every GPU or codec.

## Recorded result

On 2026-11-01 the expanded browser suite completed **10/10 passing assertions** against the production Vite preview. The local unit suite and package import review passed. CI and registry publication status must be checked against the release commit; this document does not assume a queued run succeeded.
