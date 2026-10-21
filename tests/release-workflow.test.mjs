import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngEndChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

function createPng(body) {
  return Buffer.concat([pngSignature, Buffer.from(body), pngEndChunk]);
}

const carrier = createPng("carrier");
const poster = createPng("update poster");

function createReleaseFixture() {
  const repoDir = mkdtempSync(join(tmpdir(), "ctdp-release-workflow-"));
  const extensionDir = join(repoDir, "extension");
  const releasesDir = join(repoDir, "releases");
  mkdirSync(extensionDir, { recursive: true });
  mkdirSync(releasesDir, { recursive: true });
  writeFileSync(
    join(extensionDir, "manifest.json"),
    JSON.stringify({ name: "place-fill", version: "0.7.4" }, null, 2) + "\n"
  );
  writeFileSync(
    join(repoDir, "README.md"),
    [
      '<img src="https://img.shields.io/badge/版本-v0.7.4-4a6fa5?style=flat-square" alt="version">',
      "下载 `place-fill-v0.7.4.zip`"
    ].join("\n")
  );
  writeFileSync(
    join(repoDir, "AGENTS.md"),
    "- Current manifest version: `0.7.4` (source: `extension/manifest.json`).\n"
  );
  writeFileSync(join(repoDir, "nodata.png"), carrier);
  return { extensionDir, releasesDir, repoDir };
}

function writeReleaseArtifacts(repoDir, zip = Buffer.from("zip"), imageCarrier = carrier) {
  writeFileSync(join(repoDir, "releases", "place-fill-v0.7.4.zip"), zip);
  writeFileSync(join(repoDir, "releases", "place-fill.png"), Buffer.concat([imageCarrier, zip]));
}

function runCommandWithoutRemoteTag(command, args) {
  if (command === "git" && args.join(" ") === "rev-parse refs/tags/v0.7.4") {
    return { stdout: "abc\n" };
  }
  if (command === "git" && args.join(" ") === "show v0.7.4:extension/manifest.json") {
    return { stdout: JSON.stringify({ name: "place-fill", version: "0.7.4" }) };
  }
  return { stdout: "" };
}

test("releaseVersion commits, tags, pushes, and verifies the requested version", async () => {
  const { repoDir } = createReleaseFixture();
  const calls = [];
  const notesFile = join(repoDir, "release-notes.md");
  const releaseNotes = [
    "## 更新内容",
    "",
    "### 新功能",
    "- 增加批量填充",
    "",
    "### 问题修复",
    "- 修复悬浮入口隐藏",
    "",
    "**完整变更**：https://github.com/coldShan/place-fill/compare/v0.7.4...v0.7.5"
  ].join("\n");
  writeFileSync(notesFile, releaseNotes);
  const releaseScript = await import("../extension/scripts/release-version.mjs");

  const result = releaseScript.releaseVersion({
    notesFile,
    repoDir,
    version: "0.7.5",
    runCommand(command, args) {
      calls.push([command].concat(args).join(" "));
      if (command === "git" && args.join(" ") === "status --porcelain") return { stdout: "" };
      if (command === "git" && args.join(" ") === "branch --show-current") return { stdout: "main\n" };
      if (command === "git" && args[0] === "rev-parse") return { stdout: "", status: 1 };
      if (command === "git" && args[0] === "ls-remote") {
        return args.includes("v0.7.5")
          ? { stdout: calls.filter((call) => call === "git push origin v0.7.5").length ? "abc\trefs/tags/v0.7.5\n" : "" }
          : { stdout: "" };
      }
      if (command === "gh" && args.join(" ") === "release view v0.7.5 --repo coldShan/place-fill --json tagName,assets") {
        return {
          stdout: JSON.stringify({
            tagName: "v0.7.5",
            assets: [{ name: "place-fill-v0.7.5.zip" }]
          })
        };
      }
      return { stdout: "" };
    },
    packageRelease() {
      return {
        fileName: "place-fill-v0.7.5.zip",
        imageFileName: "place-fill.png",
        imageOutputPath: join(repoDir, "releases", "place-fill.png"),
        outputPath: join(repoDir, "releases", "place-fill-v0.7.5.zip")
      };
    }
  });

  const manifest = JSON.parse(readFileSync(join(repoDir, "extension", "manifest.json"), "utf8"));
  const readme = readFileSync(join(repoDir, "README.md"), "utf8");
  const agents = readFileSync(join(repoDir, "AGENTS.md"), "utf8");

  assert.equal(manifest.version, "0.7.5");
  assert.match(readme, /版本-v0\.7\.5-/);
  assert.match(readme, /place-fill-v0\.7\.5\.zip/);
  assert.match(agents, /Current manifest version: `0\.7\.5`/);
  assert.equal(result.tagName, "v0.7.5");
  assert.equal(result.branch, "main");
  assert.deepEqual(
    calls.filter((call) => call.startsWith("git ")),
    [
      "git status --porcelain",
      "git rev-parse -q --verify refs/tags/v0.7.5",
      "git ls-remote --tags origin v0.7.5",
      "git branch --show-current",
      "git add extension/manifest.json README.md AGENTS.md",
      "git commit -m chore: 发布 0.7.5 版本",
      "git tag v0.7.5",
      "git push origin main",
      "git push origin v0.7.5",
      "git ls-remote --tags origin v0.7.5"
    ]
  );
  assert.equal(readFileSync(notesFile, "utf8"), releaseNotes);
  assert.deepEqual(
    calls.filter((call) => call.startsWith("gh release view")),
    ["gh release view v0.7.5 --repo coldShan/place-fill --json tagName,assets"]
  );
  const createReleaseCall = calls.find((call) => call.startsWith("gh release create"));
  assert.match(createReleaseCall, new RegExp(`--notes-file ${notesFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(createReleaseCall, /place-fill-v0\.7\.5\.zip/);
  assert.doesNotMatch(createReleaseCall, /place-fill\.png/);
  assert.deepEqual(
    calls.filter((call) => call.startsWith("pnpm ")),
    ["pnpm run check", "pnpm test"]
  );
});

test("releaseVersion requires non-empty authored release notes", async () => {
  const { repoDir } = createReleaseFixture();
  const emptyNotesFile = join(repoDir, "empty-notes.md");
  writeFileSync(emptyNotesFile, "\n");
  const { releaseVersion } = await import("../extension/scripts/release-version.mjs");

  assert.throws(() => releaseVersion({ repoDir, version: "0.7.5" }), /release notes file is required/);
  assert.throws(
    () => releaseVersion({ notesFile: emptyNotesFile, repoDir, version: "0.7.5" }),
    /release notes file must not be empty/
  );
});

test("releaseVersion packages with the requested carrier image", async () => {
  const { repoDir } = createReleaseFixture();
  const notesFile = join(repoDir, "release-notes.md");
  const posterPath = join(repoDir, "update-poster.png");
  writeFileSync(notesFile, "## 更新内容\n");
  writeFileSync(posterPath, poster);
  const { releaseVersion } = await import("../extension/scripts/release-version.mjs");

  let packageOptions = null;
  releaseVersion({
    carrier: "update-poster.png",
    notesFile,
    repoDir,
    version: "0.7.5",
    runCommand(command, args) {
      if (command === "git" && args.join(" ") === "branch --show-current") return { stdout: "main\n" };
      if (command === "git" && args[0] === "rev-parse") return { stdout: "", status: 1 };
      if (command === "git" && args.join(" ") === "ls-remote --tags origin v0.7.5") {
        return { stdout: packageOptions ? "abc\trefs/tags/v0.7.5\n" : "" };
      }
      if (command === "gh" && args[1] === "view") {
        return { stdout: JSON.stringify({ tagName: "v0.7.5", assets: [{ name: "place-fill-v0.7.5.zip" }] }) };
      }
      return { stdout: "" };
    },
    packageRelease(options) {
      packageOptions = options;
      return {
        fileName: "place-fill-v0.7.5.zip",
        imageFileName: "place-fill.png",
        imageOutputPath: join(repoDir, "releases", "place-fill.png"),
        outputPath: join(repoDir, "releases", "place-fill-v0.7.5.zip")
      };
    }
  });

  assert.equal(packageOptions.carrierPath, posterPath);
});

test("releaseVersion rejects an invalid carrier before changing the manifest", async () => {
  const { repoDir } = createReleaseFixture();
  const notesFile = join(repoDir, "release-notes.md");
  writeFileSync(notesFile, "## 更新内容\n");
  writeFileSync(join(repoDir, "poster.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  const { releaseVersion } = await import("../extension/scripts/release-version.mjs");

  assert.throws(
    () => releaseVersion({ carrier: "poster.jpg", notesFile, repoDir, version: "0.7.5" }),
    /release image carrier must be a complete PNG/
  );
  const manifest = JSON.parse(readFileSync(join(repoDir, "extension", "manifest.json"), "utf8"));
  assert.equal(manifest.version, "0.7.4");
});

test("verifyRelease accepts a disguised image built on any complete PNG carrier", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  writeReleaseArtifacts(repoDir, Buffer.from("zip"), poster);

  // Getting past the image check to the remote tag check means the poster carrier was accepted.
  assert.throws(
    () => verifyScript.verifyRelease({ repoDir, runCommand: runCommandWithoutRemoteTag }),
    /remote tag v0\.7\.4 not found/
  );
});

test("verifyRelease checks the disguised image against an explicit carrier", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  const posterPath = join(repoDir, "update-poster.png");
  writeFileSync(posterPath, poster);
  writeReleaseArtifacts(repoDir);

  assert.throws(
    () => verifyScript.verifyRelease({ carrierPath: posterPath, repoDir, runCommand: runCommandWithoutRemoteTag }),
    /disguised release image does not use carrier/
  );

  writeReleaseArtifacts(repoDir, Buffer.from("zip"), poster);
  assert.throws(
    () => verifyScript.verifyRelease({ carrierPath: posterPath, repoDir, runCommand: runCommandWithoutRemoteTag }),
    /remote tag v0\.7\.4 not found/
  );
});

test("verifyRelease fails when the manifest version has no remote tag", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  writeReleaseArtifacts(repoDir);

  assert.throws(
    () => verifyScript.verifyRelease({
      repoDir,
      runCommand(command, args) {
        if (command === "git" && args.join(" ") === "rev-parse refs/tags/v0.7.4") {
          return { stdout: "abc\n" };
        }
        if (command === "git" && args.join(" ") === "show v0.7.4:extension/manifest.json") {
          return { stdout: JSON.stringify({ name: "place-fill", version: "0.7.4" }) };
        }
        if (command === "git" && args.join(" ") === "ls-remote --tags origin v0.7.4") {
          return { stdout: "" };
        }
        return { stdout: "" };
      }
    }),
    /remote tag v0\.7\.4 not found/
  );
});

test("verifyRelease fails when AGENTS.md has a stale version", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  writeFileSync(
    join(repoDir, "AGENTS.md"),
    "- Current manifest version: `0.7.3` (source: `extension/manifest.json`).\n"
  );

  assert.throws(
    () => verifyScript.verifyRelease({ repoDir }),
    /AGENTS\.md does not reference manifest version 0\.7\.4/
  );
});

test("verifyRelease fails when the disguised image does not contain the current zip", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  writeReleaseArtifacts(repoDir);
  writeFileSync(join(repoDir, "releases", "place-fill.png"), Buffer.concat([carrier, Buffer.from("old zip")]));

  assert.throws(
    () => verifyScript.verifyRelease({ repoDir }),
    /disguised release image does not contain the current release zip/
  );
});

test("verifyRelease fails when the GitHub Release is missing", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  writeReleaseArtifacts(repoDir);

  assert.throws(
    () => verifyScript.verifyRelease({
      repoDir,
      runCommand(command, args) {
        if (command === "git" && args.join(" ") === "rev-parse refs/tags/v0.7.4") {
          return { stdout: "abc\n" };
        }
        if (command === "git" && args.join(" ") === "show v0.7.4:extension/manifest.json") {
          return { stdout: JSON.stringify({ name: "place-fill", version: "0.7.4" }) };
        }
        if (command === "git" && args.join(" ") === "ls-remote --tags origin v0.7.4") {
          return { stdout: "abc\trefs/tags/v0.7.4\n" };
        }
        if (command === "gh" && args.join(" ") === "release view v0.7.4 --repo coldShan/place-fill --json tagName,assets") {
          return { stdout: "", status: 1, stderr: "release not found" };
        }
        return { stdout: "" };
      }
    }),
    /GitHub Release v0\.7\.4 not found/
  );
});
