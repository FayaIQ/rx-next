import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** Deterministic build identity, including when the deployment omits Git metadata. */
export function buildReleaseId(root = process.cwd()) {
  const files: string[] = [];
  function collect(relative: string) {
    const directory = path.join(root, relative);
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || ["generated", "node_modules"].includes(entry.name)) continue;
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) collect(name);
      else if (entry.isFile() && /\.(?:ts|tsx|js|jsx|mjs|cjs|json|sql|prisma)$/.test(name)) files.push(name);
    }
  }
  for (const directory of ["src", "prisma", "scripts"]) collect(directory);
  for (const name of ["package.json", "pnpm-lock.yaml", "next.config.ts", "public/offline.html"]) {
    if (existsSync(path.join(root, name))) files.push(name);
  }
  const hash = createHash("sha256");
  for (const name of files.sort()) hash.update(name).update("\0").update(readFileSync(path.join(root, name))).update("\0");
  return `src-${hash.digest("hex").slice(0, 16)}`;
}
