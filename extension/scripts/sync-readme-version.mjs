import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const extensionDir = resolve(scriptsDir, "..");
const repoDir = resolve(extensionDir, "..");
const manifestPath = join(extensionDir, "manifest.json");
const readmePath = join(repoDir, "README.md");

function replaceRequired(source, pattern, replacer, label) {
  let matched = false;
  const updated = source.replace(pattern, function (...args) {
    matched = true;
    return replacer(...args);
  });

  if (!matched) {
    throw new Error(`README ${label} marker not found`);
  }

  return updated;
}

export function syncReadmeVersion({
  manifestPath: targetManifestPath = manifestPath,
  readmePath: targetReadmePath = readmePath
} = {}) {
  const manifest = JSON.parse(readFileSync(targetManifestPath, "utf8"));
  const version = String(manifest.version || "").trim();

  if (!version) {
    throw new Error("manifest version is required");
  }

  const readme = readFileSync(targetReadmePath, "utf8");
  const withBadgeVersion = replaceRequired(
    readme,
    /(https:\/\/img\.shields\.io\/badge\/版本-v)([^-]+)(-4a6fa5\?style=flat-square)/,
    function (_, prefix, __, suffix) {
      return `${prefix}${version}${suffix}`;
    },
    "badge version"
  );
  const nextReadme = replaceRequired(
    withBadgeVersion,
    /(`place-fill-v)([^`\n]+)(\.zip`)/,
    function (_, prefix, __, suffix) {
      return `${prefix}${version}${suffix}`;
    },
    "release zip version"
  );

  if (nextReadme !== readme) {
    writeFileSync(targetReadmePath, nextReadme);
  }

  return { readmePath: targetReadmePath, version };
}

if (resolve(process.argv[1] || "") === scriptPath) {
  const result = syncReadmeVersion();
  console.log(`${result.readmePath} -> v${result.version}`);
}
