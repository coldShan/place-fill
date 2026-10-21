import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngEndChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

function createPng(body) {
  return Buffer.concat([pngSignature, Buffer.from(body), pngEndChunk]);
}

async function loadPackageReleaseModule() {
  try {
    return await import("../extension/scripts/package-release.mjs");
  } catch {
    return null;
  }
}

test("buildReleaseZipName includes the manifest version in the release asset name", async () => {
  const releaseScript = await loadPackageReleaseModule();

  assert.equal(typeof releaseScript?.buildReleaseZipName, "function");
  assert.equal(
    releaseScript?.buildReleaseZipName({ name: "place-fill", version: "0.3.1" }),
    "place-fill-v0.3.1.zip"
  );
});

test("packageRelease targets the releases directory with a versioned zip filename", async () => {
  const releaseScript = await loadPackageReleaseModule();
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-release-"));
  const extensionDir = join(rootDir, "extension");
  const releasesDir = join(rootDir, "releases");
  const carrierPath = join(rootDir, "nodata.png");
  const carrier = createPng("carrier");
  const zip = Buffer.from("zip");
  mkdirSync(extensionDir, { recursive: true });
  writeFileSync(carrierPath, carrier);
  writeFileSync(
    join(extensionDir, "manifest.json"),
    JSON.stringify({ name: "place-fill", version: "1.2.3" }, null, 2)
  );

  let zipCall = null;
  const result = releaseScript?.packageRelease({
    carrierPath,
    extensionDir,
    releasesDir,
    runZip(args) {
      zipCall = args;
      writeFileSync(args.outputPath, zip);
    }
  });

  assert.equal(typeof releaseScript?.packageRelease, "function");
  assert.deepEqual(result, {
    fileName: "place-fill-v1.2.3.zip",
    imageFileName: "place-fill.png",
    imageOutputPath: join(releasesDir, "place-fill.png"),
    manifest: { name: "place-fill", version: "1.2.3" },
    outputPath: join(releasesDir, "place-fill-v1.2.3.zip")
  });
  assert.equal(existsSync(releasesDir), true);
  assert.deepEqual(zipCall, {
    extensionDir,
    outputPath: join(releasesDir, "place-fill-v1.2.3.zip")
  });
  assert.deepEqual(readFileSync(join(releasesDir, "place-fill.png")), Buffer.concat([carrier, zip]));
});

test("packageRelease runs README version sync before packaging when provided", async () => {
  const releaseScript = await loadPackageReleaseModule();
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-release-sync-"));
  const extensionDir = join(rootDir, "extension");
  const releasesDir = join(rootDir, "releases");
  mkdirSync(extensionDir, { recursive: true });
  writeFileSync(
    join(extensionDir, "manifest.json"),
    JSON.stringify({ name: "place-fill", version: "1.2.3" }, null, 2)
  );

  let synced = 0;
  releaseScript?.packageRelease({
    createImage() {},
    extensionDir,
    releasesDir,
    syncReadme() {
      synced += 1;
    },
    runZip() {}
  });

  assert.equal(synced, 1);
});

test("packageRelease uses a custom carrier image such as a version update poster", async () => {
  const releaseScript = await loadPackageReleaseModule();
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-release-carrier-"));
  const extensionDir = join(rootDir, "extension");
  const releasesDir = join(rootDir, "releases");
  const posterPath = join(rootDir, "update-poster.png");
  const poster = createPng("update poster");
  const zip = Buffer.from("zip");
  mkdirSync(extensionDir, { recursive: true });
  writeFileSync(posterPath, poster);
  writeFileSync(
    join(extensionDir, "manifest.json"),
    JSON.stringify({ name: "place-fill", version: "1.2.3" }, null, 2)
  );

  releaseScript?.packageRelease({
    carrierPath: posterPath,
    extensionDir,
    releasesDir,
    runZip(args) {
      writeFileSync(args.outputPath, zip);
    }
  });

  assert.deepEqual(readFileSync(join(releasesDir, "place-fill.png")), Buffer.concat([poster, zip]));
});

test("createDisguisedReleaseImage rejects carriers that are not complete PNG files", async () => {
  const releaseScript = await loadPackageReleaseModule();
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-release-bad-carrier-"));
  const zipPath = join(rootDir, "release.zip");
  const outputPath = join(rootDir, "place-fill.png");
  const jpegPath = join(rootDir, "poster.jpg");
  const truncatedPath = join(rootDir, "truncated.png");
  writeFileSync(zipPath, "zip");
  writeFileSync(jpegPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  writeFileSync(truncatedPath, Buffer.concat([pngSignature, Buffer.from("no end chunk")]));

  for (const carrierPath of [jpegPath, truncatedPath]) {
    assert.throws(
      () => releaseScript?.createDisguisedReleaseImage({ carrierPath, outputPath, zipPath }),
      /release image carrier must be a complete PNG/
    );
  }
  assert.equal(existsSync(outputPath), false);
});

test("repository keeps tests outside the packaged extension directory", () => {
  assert.equal(existsSync(join(process.cwd(), "tests")), true);
  assert.equal(existsSync(join(process.cwd(), "extension", "tests")), false);
});
