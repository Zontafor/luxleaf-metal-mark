/** Original LuxLeaf optical math. Directions are unit vectors pointing away from the surface. */
export type Vec3 = readonly [number, number, number];
export const dot = (a: Vec3, b: Vec3) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(...v);
  if (!Number.isFinite(length) || length === 0)
    throw Error("A finite nonzero direction is required");
  return [v[0] / length, v[1] / length, v[2] / length];
}
export function reflect(incident: Vec3, normal: Vec3): Vec3 {
  const n = normalize(normal),
    d = dot(incident, n);
  return [
    incident[0] - 2 * d * n[0],
    incident[1] - 2 * d * n[1],
    incident[2] - 2 * d * n[2],
  ];
}
/** Unpolarized conductor Fresnel, including complex Snell refraction into an absorbing medium. */
export function conductorFresnel(
  cosine: number,
  eta: number,
  extinction: number
): number {
  if (
    ![cosine, eta, extinction].every(Number.isFinite) ||
    cosine < 0 ||
    cosine > 1 ||
    eta <= 0 ||
    extinction < 0
  )
    throw Error("Invalid optical constants");
  if (eta === 1 && extinction === 0) return 0;
  if (cosine === 0) return 1;
  const c2 = cosine * cosine,
    s2 = 1 - c2;
  const t = eta * eta - extinction * extinction - s2;
  const magnitude = Math.hypot(t, 2 * eta * extinction);
  const real = Math.sqrt(Math.max(0, (magnitude + t) / 2));
  const cross = 2 * cosine * real;
  const rs = (magnitude + c2 - cross) / (magnitude + c2 + cross);
  const rp =
    (rs * (c2 * magnitude + s2 * s2 - cross * s2)) /
    (c2 * magnitude + s2 * s2 + cross * s2);
  return Math.max(0, Math.min(1, (rs + rp) / 2));
}
export function ggxDistribution(noH: number, alpha: number) {
  if (noH <= 0) return 0;
  const a2 = alpha * alpha,
    denominator = noH * noH * (a2 - 1) + 1;
  return a2 / (Math.PI * denominator * denominator);
}
export function smithMask(noDirection: number, alpha: number) {
  if (noDirection <= 0) return 0;
  return (
    (2 * noDirection) /
    (noDirection +
      Math.sqrt(
        alpha * alpha + (1 - alpha * alpha) * noDirection * noDirection
      ))
  );
}
/** Single-scattering GGX conductor BRDF in a frame with normal (0,0,1), before display transforms. */
export function conductorBRDF(
  view: Vec3,
  light: Vec3,
  roughness: number,
  eta = 0.2,
  extinction = 3.4
) {
  if (!Number.isFinite(roughness) || roughness < 0.05 || roughness > 1)
    throw Error("Invalid roughness");
  const v = normalize(view),
    l = normalize(light);
  if (v[2] <= 0 || l[2] <= 0) return 0;
  const h = normalize([v[0] + l[0], v[1] + l[1], v[2] + l[2]]),
    alpha = roughness * roughness;
  return (
    (conductorFresnel(Math.max(0, Math.min(1, dot(v, h))), eta, extinction) *
      ggxDistribution(h[2], alpha) *
      smithMask(v[2], alpha) *
      smithMask(l[2], alpha)) /
    (4 * v[2] * l[2])
  );
}
