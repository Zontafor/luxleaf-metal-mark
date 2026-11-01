# Private release procedure

1. Use Node 24 and run `npm ci --ignore-scripts` from the committed lockfile.
2. Run `npm run verify`; inspect every result, then open `/checks.html` in a real browser and run its assertions. Inspect the workbench visually and exercise controls.
3. Review `npm pack --dry-run --json`. Only the library output, package metadata, docs and notices should ship. No recording, keys, node_modules or unrelated files belong in the archive.
4. Run `npm pack`, install that archive in a fresh authorized consumer and import its public entry point. Use `npm ls react` to detect incompatible duplicate React installations.
5. Commit reviewed changes, push to the private Zontafor repository, and verify GitHub Actions at that exact commit.
6. Tag the reviewed commit and attach the archive and a SHA-256 checksum to a private GitHub release. Never publish this package to a public registry or change repository visibility as part of the release script.

Changes to runtime dependencies require regenerated notices and inventory. Breaking preset or API changes require a documented migration and a version change. The current workflow does not deploy to a live service, issue credentials, or provision paid resources.
