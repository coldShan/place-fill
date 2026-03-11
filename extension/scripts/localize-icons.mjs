import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const OFFICIAL_LUCIDE_BASE_URL = "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons";

export function createLucideIconUrl(name) {
  return OFFICIAL_LUCIDE_BASE_URL + "/" + String(name) + ".svg";
}

export function collectIconSpecs(iconAssetsApi) {
  const entries = Object.entries((iconAssetsApi && iconAssetsApi.ICON_PATHS) || {});
  const seen = new Map();
  entries.forEach(function ([name, assetPath]) {
    if (!assetPath || seen.has(assetPath)) return;
    seen.set(assetPath, { name, assetPath });
  });
  return Array.from(seen.values()).sort(function (left, right) {
    return left.name.localeCompare(right.name);
  });
}

export async function downloadLucideIcon(name) {
  const response = await fetch(createLucideIconUrl(name));
  if (!response.ok) throw new Error("Failed to download icon: " + name + " (" + response.status + ")");
  return response.text();
}

export async function localizeIcons(iconSpecs, options) {
  const opts = options || {};
  const rootDir = opts.rootDir || process.cwd();
  const force = opts.force === true;
  const downloadIcon = opts.downloadIcon || downloadLucideIcon;
  const result = { downloaded: [], skipped: [], removed: [] };
  const iconsDir = join(rootDir, "assets/icons/lucide");
  const usedPaths = new Set(
    (iconSpecs || []).map(function (spec) {
      return join(rootDir, spec.assetPath);
    })
  );

  for (const spec of iconSpecs || []) {
    const outputPath = join(rootDir, spec.assetPath);
    if (!force && existsSync(outputPath)) {
      result.skipped.push(spec.name);
      continue;
    }
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, await downloadIcon(spec.name, createLucideIconUrl(spec.name)));
    result.downloaded.push(spec.name);
  }

  if (existsSync(iconsDir)) {
    readdirSync(iconsDir, { withFileTypes: true }).forEach(function (entry) {
      if (!entry.isFile() || !entry.name.endsWith(".svg")) return;
      const filePath = join(iconsDir, entry.name);
      if (usedPaths.has(filePath)) return;
      unlinkSync(filePath);
      result.removed.push(entry.name.replace(/\.svg$/, ""));
    });
    result.removed.sort();
  }

  return result;
}

export function loadUsedIconSpecs(rootDir) {
  const projectRoot = rootDir || resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const iconAssetsApi = require(join(projectRoot, "src/icon-assets.js"));
  return collectIconSpecs(iconAssetsApi);
}

async function main() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const force = process.argv.includes("--force");
  const result = await localizeIcons(loadUsedIconSpecs(rootDir), { rootDir, force });
  console.log(
    [
      "downloaded=" + result.downloaded.length,
      "skipped=" + result.skipped.length,
      "removed=" + result.removed.length,
      result.downloaded.length ? "downloadedIcons=" + result.downloaded.join(",") : "",
      result.skipped.length ? "skippedIcons=" + result.skipped.join(",") : "",
      result.removed.length ? "removedIcons=" + result.removed.join(",") : ""
    ]
      .filter(Boolean)
      .join("\n")
  );
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch(function (error) {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  });
}
