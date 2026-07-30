import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
  return { extensionDir, releasesDir, repoDir };
}

test("releaseVersion commits, tags, pushes, and verifies the requested version", async () => {
  const { repoDir } = createReleaseFixture();
  const calls = [];
  const releaseScript = await import("../extension/scripts/release-version.mjs");

  const result = releaseScript.releaseVersion({
    repoDir,
    version: "0.7.5",
    runCommand(command, args) {
      calls.push([command].concat(args).join(" "));
      if (command === "git" && args.join(" ") === "status --porcelain") return { stdout: "" };
      if (command === "git" && args.join(" ") === "branch --show-current") return { stdout: "main\n" };
      if (command === "git" && args[0] === "rev-parse") return { stdout: "", status: 1 };
      if (command === "git" && args.join(" ") === "log --no-merges --format=%s v0.7.4..HEAD") {
        return {
          stdout: [
            "feat: 增加批量填充",
            "fix(panel): 修复悬浮入口隐藏",
            "fix: 修复悬浮入口隐藏",
            "chore: 调整发布流程"
          ].join("\n")
        };
      }
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
        outputPath: join(repoDir, "releases", "place-fill-v0.7.5.zip")
      };
    }
  });

  const manifest = JSON.parse(readFileSync(join(repoDir, "extension", "manifest.json"), "utf8"));
  const readme = readFileSync(join(repoDir, "README.md"), "utf8");

  assert.equal(manifest.version, "0.7.5");
  assert.match(readme, /版本-v0\.7\.5-/);
  assert.match(readme, /place-fill-v0\.7\.5\.zip/);
  assert.equal(result.tagName, "v0.7.5");
  assert.equal(result.branch, "main");
  assert.deepEqual(
    calls.filter((call) => call.startsWith("git ")),
    [
      "git status --porcelain",
      "git rev-parse -q --verify refs/tags/v0.7.5",
      "git ls-remote --tags origin v0.7.5",
      "git log --no-merges --format=%s v0.7.4..HEAD",
      "git branch --show-current",
      "git add extension/manifest.json README.md",
      "git commit -m chore: 发布 0.7.5 版本",
      "git tag v0.7.5",
      "git push origin main",
      "git push origin v0.7.5",
      "git ls-remote --tags origin v0.7.5"
    ]
  );
  assert.deepEqual(
    calls.filter((call) => call.startsWith("gh release view")),
    ["gh release view v0.7.5 --repo coldShan/place-fill --json tagName,assets"]
  );
  const createReleaseCall = calls.find((call) => call.startsWith("gh release create"));
  assert.match(createReleaseCall, /## 更新内容/);
  assert.match(createReleaseCall, /### 新功能\n- 增加批量填充/);
  assert.match(createReleaseCall, /### 问题修复\n- 修复悬浮入口隐藏/);
  assert.doesNotMatch(createReleaseCall, /调整发布流程/);
  assert.match(createReleaseCall, /compare\/v0\.7\.4\.\.\.v0\.7\.5/);
  assert.deepEqual(
    calls.filter((call) => call.startsWith("pnpm ")),
    ["pnpm run check", "pnpm test"]
  );
});

test("buildReleaseNotes groups user-facing changes and removes duplicates", async () => {
  const { buildReleaseNotes } = await import("../extension/scripts/release-version.mjs");
  const notes = buildReleaseNotes({
    previousTag: "v0.8.0",
    tagName: "v0.8.1",
    commitSubjects: [
      "feat: 增加备份提醒",
      "fix: 修复提醒漏发",
      "fix(panel): 修复提醒漏发",
      "优化表单样式",
      "docs: 更新说明",
      "chore: 发布 0.8.1 版本"
    ]
  });

  assert.equal(
    notes,
    [
      "## 更新内容",
      "",
      "### 新功能",
      "- 增加备份提醒",
      "",
      "### 问题修复",
      "- 修复提醒漏发",
      "",
      "### 优化调整",
      "- 优化表单样式",
      "",
      "**完整变更**：https://github.com/coldShan/place-fill/compare/v0.8.0...v0.8.1"
    ].join("\n")
  );
});

test("verifyRelease fails when the manifest version has no remote tag", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  writeFileSync(join(repoDir, "releases", "place-fill-v0.7.4.zip"), "zip");

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

test("verifyRelease fails when the GitHub Release is missing", async () => {
  const { repoDir } = createReleaseFixture();
  const verifyScript = await import("../extension/scripts/verify-release.mjs");
  writeFileSync(join(repoDir, "releases", "place-fill-v0.7.4.zip"), "zip");

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
