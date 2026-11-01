# Release procedure

1. Run `npm ci --ignore-scripts`, `npm run verify`, and `npm run verify:package`.
2. Run browser checks and inspect the expanded workbench. Record limitations accurately.
3. Review the actual tarball, licenses, source inventory and credential scan. Commit and push the reviewed source.
4. Require the Package verification workflow to pass on that commit. Create an immutable version tag and GitHub Release containing the `.tgz` and SHA-256 checksum.
5. Dispatch **Publish GitHub package**. Its repository-scoped `GITHUB_TOKEN` publishes `@zontafor/luxleaf-metal-mark` and verifies a fresh registry installation. The workflow has package write access only in its publication job.
6. Verify registry metadata and repository visibility separately. GitHub npm packages initially default to private; public repository visibility does not automatically change package visibility. Public npm packages still require registry authentication. Public release assets are a separate distribution route.

Never put a personal access token in the repository. Do not overwrite an existing version. A version bump requires another verification run.
