import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReleaseId } from "../../../scripts/release-id";

test("release identity changes with shipped source but excludes credentials and generated files", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "rx-release-id-"));
  try {
    mkdirSync(path.join(directory, "src", "generated"), { recursive: true });
    writeFileSync(path.join(directory, "package.json"), '{"version":"1"}');
    writeFileSync(path.join(directory, "src", "app.ts"), "export const version = 1;");
    const original = buildReleaseId(directory);
    assert.match(original, /^src-[a-f0-9]{16}$/);
    writeFileSync(path.join(directory, ".env.local"), "DATABASE_URL=private");
    writeFileSync(path.join(directory, "src", "generated", "client.ts"), "generated");
    assert.equal(buildReleaseId(directory), original);
    writeFileSync(path.join(directory, "src", "app.ts"), "export const version = 2;");
    assert.notEqual(buildReleaseId(directory), original);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
