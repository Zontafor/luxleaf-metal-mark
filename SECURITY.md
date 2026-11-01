# Security

Treat imported configurations and image assets as untrusted. Do not embed credentials or customer content in example data. Renderers operate in the browser. Report security issues privately to the repository owner. Do not post secrets in issues.

## Expanded v0.2.0 boundaries

Reference source under `foundations/` is preserved for completeness and audit. Historical tooling there is not executed by the LuxLeaf verification workflow and is not covered by the active dependency audit. Browser file inputs have explicit bounds but are not a media sandbox. Optical capture must be restricted to content the host is authorized to process. Editor and native adapters require their host security model. The optional Metal Mark SQLite server requires a supplied bearer token and defaults to authenticated reads; remote use additionally requires HTTPS, rate limiting, storage quotas, monitoring and an application authorization design.
