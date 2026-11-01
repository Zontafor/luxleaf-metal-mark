// Original LuxLeaf validation. Copyright 2026 Michelle L. Wu.
export function number(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Invalid ${name}`);
  return value;
}
export function color(value: unknown): string {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))
    throw new Error("Expected six-digit hex color");
  return value;
}
export function rgb(value: string): [number, number, number] {
  color(value);
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}
export function object(
  value: unknown,
  keys: string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    throw new Error("Unknown configuration fields");
  return value as Record<string, unknown>;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Expected Boolean");
  return value;
}
export function parseJSON(text: string): unknown {
  if (text.length > 16384) throw new Error("Configuration too large");
  return JSON.parse(text);
}
