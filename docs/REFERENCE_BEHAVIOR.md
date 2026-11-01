# Independent logo behavior implementation

The target is the public `paper-design/liquid-logo` repository's published UI screenshot and demonstrated input/output behavior, not Paper's later full design application. The original demo URL now redirects to that larger application.

Observed in the original README screenshot on 2026-11-01:

- Large logo preview beside a control panel.
- Background choices: gradient, white, black, custom color.
- Refraction (displayed default 0.015), Edge (0.400), Pattern Blur (0.005), Liquify (0.070), Speed (0.300), Pattern Scale (2.0).
- Each effect has a slider and numeric input.
- Upload image action; transparent or white background inputs, including SVG.
- Example/logo selector row.

Repository tree metadata also identifies an upload API and share-by-ID route. The visible screenshot does not establish their complete request/response contracts.

Implementation rule: preserve these observable controls and workflow using independently authored code. Do not copy the restricted shaders, parser, UI source, logos or other assets. Original LuxLeaf procedural example shapes stand in for third-party logo artwork; this is a documented asset difference. Exact pixels, internal algorithm, undocumented API contracts and timing equivalence are not yet established.

Source: https://github.com/paper-design/liquid-logo (README image and file-tree metadata only). The separately observed current public playground is not substituted for the older demo's specification.
