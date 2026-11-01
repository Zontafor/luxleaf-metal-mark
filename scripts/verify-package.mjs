import { execFileSync } from "node:child_process";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const p = JSON.parse(await readFile("package.json", "utf8"));
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--ignore-scripts", "--json"], {
    encoding: "utf8",
  }),
)[0];
for (const entry of Object.values(p.exports)) {
  for (const target of Object.values(
    typeof entry === "string" ? { path: entry } : entry,
  )) {
    if (!packed.files.some((x) => x.path === target.replace(/^\.\//, "")))
      throw Error("Missing exported file " + target);
  }
}
for (const needed of [
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "src/index.tsx",
  "docs/CAPABILITIES.md",
])
  if (!packed.files.some((x) => x.path === needed))
    throw Error("Missing distribution content " + needed);
const dir = await mkdtemp(join(tmpdir(), "luxleaf-consumer-"));
try {
  execFileSync("tar", ["-xzf", resolve(packed.filename), "-C", dir]);
  // Installable artifact is loaded outside the source tree; dependencies resolve through a linked dependency tree.
  const { symlink } = await import("node:fs/promises");
  await symlink(
    resolve("node_modules"),
    join(dir, "package/node_modules"),
    "dir",
  );
  const imported = [];
  for (const [key, entry] of Object.entries(p.exports)) {
    if (key === "./native" || key.endsWith(".css")) continue;
    const file = typeof entry === "string" ? entry : entry.import;
    if (!file || !file.endsWith(".js")) continue;
    await import("file://" + join(dir, "package", file));
    imported.push(key);
  }
  console.log(
    JSON.stringify({
      name: p.name,
      version: p.version,
      files: packed.files.length,
      packedBytes: packed.size,
      imported,
      native: "Requires React Native host; not executed here",
    }),
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
