import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function loadPackageReleaseModule() {
  try {
    return await import("../scripts/package-release.mjs");
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
  mkdirSync(extensionDir, { recursive: true });
  writeFileSync(
    join(extensionDir, "manifest.json"),
    JSON.stringify({ name: "place-fill", version: "1.2.3" }, null, 2)
  );

  let zipCall = null;
  const result = releaseScript?.packageRelease({
    extensionDir,
    releasesDir,
    runZip(args) {
      zipCall = args;
    }
  });

  assert.equal(typeof releaseScript?.packageRelease, "function");
  assert.deepEqual(result, {
    fileName: "place-fill-v1.2.3.zip",
    manifest: { name: "place-fill", version: "1.2.3" },
    outputPath: join(releasesDir, "place-fill-v1.2.3.zip")
  });
  assert.equal(existsSync(releasesDir), true);
  assert.deepEqual(zipCall, {
    extensionDir,
    outputPath: join(releasesDir, "place-fill-v1.2.3.zip")
  });
});
