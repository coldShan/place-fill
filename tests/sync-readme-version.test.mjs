import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function loadSyncReadmeVersionModule() {
  try {
    return await import("../extension/scripts/sync-readme-version.mjs");
  } catch {
    return null;
  }
}

test("syncVersionReferences updates README and AGENTS.md from manifest version", async () => {
  const syncScript = await loadSyncReadmeVersionModule();
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-readme-version-"));
  const extensionDir = join(rootDir, "extension");
  const manifestPath = join(extensionDir, "manifest.json");
  const readmePath = join(rootDir, "README.md");
  const agentsPath = join(rootDir, "AGENTS.md");

  mkdirSync(extensionDir, { recursive: true });
  writeFileSync(
    manifestPath,
    JSON.stringify({ name: "place-fill", version: "1.2.3" }, null, 2)
  );
  writeFileSync(
    readmePath,
    [
      '<img src="https://img.shields.io/badge/版本-v0.0.1-4a6fa5?style=flat-square" alt="version">',
      "下载 `place-fill-v0.0.1.zip`"
    ].join("\n")
  );
  writeFileSync(
    agentsPath,
    "- Current manifest version: `0.0.1` (source: `extension/manifest.json`).\n"
  );

  assert.equal(typeof syncScript?.syncVersionReferences, "function");

  const result = syncScript?.syncVersionReferences({ agentsPath, manifestPath, readmePath });
  const readme = readFileSync(readmePath, "utf8");
  const agents = readFileSync(agentsPath, "utf8");

  assert.deepEqual(result, {
    agents: {
      agentsPath,
      version: "1.2.3"
    },
    readme: {
      readmePath,
      version: "1.2.3"
    }
  });
  assert.match(readme, /版本-v1\.2\.3-/);
  assert.match(readme, /place-fill-v1\.2\.3\.zip/);
  assert.match(agents, /Current manifest version: `1\.2\.3`/);
});
