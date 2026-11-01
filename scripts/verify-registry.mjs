import { execFileSync } from "node:child_process";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const p = JSON.parse(await readFile("package.json", "utf8"));
const dir = await mkdtemp(join(tmpdir(), "luxleaf-registry-"));
try {
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  await writeFile(
    join(dir, ".npmrc"),
    "@zontafor:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n",
  );
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", p.name + "@" + p.version],
    { cwd: dir, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "await import(" +
        JSON.stringify(p.name) +
        '); console.log("Verified registry install")',
    ],
    { cwd: dir, stdio: "inherit" },
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
