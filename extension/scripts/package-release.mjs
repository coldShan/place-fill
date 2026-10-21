import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncReadmeVersion } from "./sync-readme-version.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const extensionDir = resolve(scriptsDir, "..");
const releasesDir = resolve(extensionDir, "..", "releases");
const carrierPngPath = resolve(extensionDir, "..", "nodata.png");
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngEndChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

export function isCompletePng(buffer) {
  return buffer.length >= pngSignature.length + pngEndChunk.length
    && buffer.subarray(0, pngSignature.length).equals(pngSignature)
    && buffer.subarray(buffer.length - pngEndChunk.length).equals(pngEndChunk);
}

export function readCarrierPng(carrierPath) {
  const carrier = readFileSync(carrierPath);
  if (!isCompletePng(carrier)) {
    throw new Error(`release image carrier must be a complete PNG: ${carrierPath}`);
  }
  return carrier;
}

export function readCliOption(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || "").trim() : "";
}

export function buildReleaseZipName({ name, version }) {
  if (!name || !version) {
    throw new Error("manifest name and version are required");
  }

  return `${name}-v${version}.zip`;
}

export function createDisguisedReleaseImage({ carrierPath, outputPath, zipPath }) {
  const carrier = readCarrierPng(carrierPath);
  const zip = readFileSync(zipPath);
  writeFileSync(outputPath, Buffer.concat([carrier, zip]));
  return { outputPath, size: carrier.length + zip.length };
}

export function packageRelease({
  carrierPath: targetCarrierPath = carrierPngPath,
  createImage = createDisguisedReleaseImage,
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
  const imageFileName = `${manifest.name}.png`;
  const imageOutputPath = join(targetReleasesDir, imageFileName);

  mkdirSync(targetReleasesDir, { recursive: true });
  rmSync(outputPath, { force: true });
  rmSync(imageOutputPath, { force: true });
  runZip({ extensionDir: targetExtensionDir, outputPath });
  createImage({
    carrierPath: targetCarrierPath,
    outputPath: imageOutputPath,
    zipPath: outputPath
  });

  return { fileName, imageFileName, imageOutputPath, manifest, outputPath };
}

if (resolve(process.argv[1] || "") === scriptPath) {
  const carrierPath = readCliOption(process.argv.slice(2), "--carrier");
  const { imageOutputPath, outputPath } = packageRelease(
    carrierPath ? { carrierPath: resolve(process.cwd(), carrierPath) } : {}
  );
  console.log(outputPath);
  console.log(imageOutputPath);
}
