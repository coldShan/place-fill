import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncReadmeVersion } from "./sync-readme-version.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const extensionDir = resolve(scriptsDir, "..");
const releasesDir = resolve(extensionDir, "..", "releases");

export function buildReleaseZipName({ name, version }) {
  if (!name || !version) {
    throw new Error("manifest name and version are required");
  }

  return `${name}-v${version}.zip`;
}

export function packageRelease({
  extensionDir: targetExtensionDir = extensionDir,
  releasesDir: targetReleasesDir = releasesDir,
  syncReadme = targetExtensionDir === extensionDir ? syncReadmeVersion : null,
  runZip = function ({ extensionDir, outputPath }) {
    const result = spawnSync("zip", ["-qr", outputPath, "."], {
      cwd: extensionDir,
      stdio: "inherit"
    });

    if (result.status !== 0) {
      throw new Error("zip command failed");
    }
  }
} = {}) {
  if (typeof syncReadme === "function") {
    syncReadme();
  }

  const manifest = JSON.parse(readFileSync(join(targetExtensionDir, "manifest.json"), "utf8"));
  const fileName = buildReleaseZipName(manifest);
  const outputPath = join(targetReleasesDir, fileName);

  mkdirSync(targetReleasesDir, { recursive: true });
  rmSync(outputPath, { force: true });
  runZip({ extensionDir: targetExtensionDir, outputPath });

  return { fileName, manifest, outputPath };
}

if (resolve(process.argv[1] || "") === scriptPath) {
  const { outputPath } = packageRelease();
  console.log(outputPath);
}
