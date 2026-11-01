const tags = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "polygon",
  "polyline",
  "line",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "title",
  "desc",
]);
const attributes = new Set([
  "xmlns",
  "viewBox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "fill",
  "fill-rule",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "stroke-dasharray",
  "opacity",
  "transform",
  "id",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "clip-path",
  "mask",
  "preserveAspectRatio",
]);
/** Geometry-only SVG subset. External resources, scripts, style sheets and embedded content are rejected. */
export function sanitizeSVG(source: string) {
  if (source.length > 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error("Unsupported SVG declaration or size");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw new Error("Invalid SVG");
  let count = 0;
  for (const node of Array.from(doc.querySelectorAll("*"))) {
    if (++count > 10000 || !tags.has(node.localName))
      throw new Error("Unsupported SVG element: " + node.localName);
    for (const attribute of Array.from(node.attributes)) {
      if (!attributes.has(attribute.name))
        throw new Error("Unsupported SVG attribute: " + attribute.name);
      if (
        /url\s*\(/i.test(attribute.value) &&
        !/^url\(#[a-zA-Z0-9_-]+\)$/.test(attribute.value.trim())
      )
        throw new Error("External SVG reference rejected");
      if (
        /(?:javascript:|https?:|data:|file:)/i.test(attribute.value) &&
        attribute.name !== "xmlns"
      )
        throw new Error("External SVG resource rejected");
    }
  }
  doc.documentElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(doc);
}
export async function decodeSVG(
  source: string,
  maxDimension = 1024,
): Promise<HTMLCanvasElement> {
  if (
    !Number.isInteger(maxDimension) ||
    maxDimension < 1 ||
    maxDimension > 2048
  )
    throw new Error("Invalid SVG raster size");
  const safe = sanitizeSVG(source),
    url = URL.createObjectURL(new Blob([safe], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("SVG has no intrinsic size");
    const ratio = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
