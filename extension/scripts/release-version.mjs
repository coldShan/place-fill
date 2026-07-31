import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packageRelease as packageReleaseImpl } from "./package-release.mjs";
import { syncVersionReferences } from "./sync-readme-version.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const defaultRepoDir = resolve(scriptsDir, "..", "..");
const repository = "coldShan/place-fill";
const ignoredReleaseNoteTypes = new Set(["build", "chore", "ci", "docs", "test"]);

function defaultRunCommand(command, args, { cwd = defaultRepoDir, stdio = "pipe" } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio
  });
  return {
    stderr: result.stderr || "",
    stdout: result.stdout || "",
    status: result.status
  };
}

function runChecked(runCommand, command, args, { allowFailure = false, cwd = defaultRepoDir, stdio = "pipe" } = {}) {
  const result = runCommand(command, args, { cwd, stdio }) || {};
  const status = Number(result.status || 0);

  if (status !== 0 && !allowFailure) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }

  return {
    stderr: String(result.stderr || ""),
    stdout: String(result.stdout || ""),
    status
  };
}

function normalizeVersion(version) {
  const normalized = String(version || "").trim().replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("version must look like 0.7.5");
  }
  return normalized;
}

function readManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

export function buildReleaseNotes({ commitSubjects, previousTag, tagName }) {
  const groups = [
    { title: "新功能", types: new Set(["feat"]), items: [] },
    { title: "问题修复", types: new Set(["fix"]), items: [] },
    { title: "优化调整", types: null, items: [] }
  ];
  const seen = new Set();

  for (const rawSubject of commitSubjects) {
    const subject = String(rawSubject || "").trim();
    if (!subject) continue;

    const match = subject.match(/^([a-z]+)(?:\([^)]+\))?!?:\s*(.+)$/i);
    const type = match?.[1]?.toLowerCase() || "";
    const text = (match?.[2] || subject).trim();
    if (!text || ignoredReleaseNoteTypes.has(type) || seen.has(text)) continue;

    seen.add(text);
    (groups.find((group) => group.types?.has(type)) || groups[2]).items.push(text);
  }

  const sections = groups
    .filter((group) => group.items.length)
    .map((group) => `### ${group.title}\n${group.items.map((item) => `- ${item}`).join("\n")}`);
  if (!sections.length) sections.push("- 维护与稳定性改进");

  return [
    "## 更新内容",
    "",
    sections.join("\n\n"),
    "",
    `**完整变更**：https://github.com/${repository}/compare/${previousTag}...${tagName}`
  ].join("\n");
}

function assertCleanWorktree({ repoDir, runCommand }) {
  const status = runChecked(runCommand, "git", ["status", "--porcelain"], { cwd: repoDir }).stdout.trim();
  if (status) {
    throw new Error("working tree must be clean before release");
  }
}

function assertTagAvailable({ repoDir, runCommand, tagName }) {
  const localTag = runChecked(
    runCommand,
    "git",
    ["rev-parse", "-q", "--verify", `refs/tags/${tagName}`],
    { allowFailure: true, cwd: repoDir }
  );
  if (localTag.status === 0 || localTag.stdout.trim()) {
    throw new Error(`local tag ${tagName} already exists`);
  }

  const remoteTag = runChecked(runCommand, "git", ["ls-remote", "--tags", "origin", tagName], { cwd: repoDir });
  if (remoteTag.stdout.trim()) {
    throw new Error(`remote tag ${tagName} already exists`);
  }
}

function updateManifestVersion({ manifestPath, version }) {
  const manifest = readManifest(manifestPath);
  const previousVersion = String(manifest.version || "").trim();

  if (previousVersion === version) {
    throw new Error(`manifest version is already ${version}`);
  }

  manifest.version = version;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { manifest, previousVersion };
}

function getCurrentBranch({ repoDir, runCommand }) {
  const branch = runChecked(runCommand, "git", ["branch", "--show-current"], { cwd: repoDir }).stdout.trim();
  if (!branch) {
    throw new Error("cannot release from detached HEAD");
  }
  return branch;
}

function assertRemoteTag({ repoDir, runCommand, tagName }) {
  const remoteTag = runChecked(runCommand, "git", ["ls-remote", "--tags", "origin", tagName], { cwd: repoDir })
    .stdout
    .trim();
  if (!remoteTag.includes(`refs/tags/${tagName}`)) {
    throw new Error(`remote tag ${tagName} not found after push`);
  }
}

function assertGitHubRelease({ repoDir, runCommand, tagName, zipName }) {
  const release = runChecked(
    runCommand,
    "gh",
    ["release", "view", tagName, "--repo", repository, "--json", "tagName,assets"],
    { cwd: repoDir }
  );
  const payload = JSON.parse(release.stdout);

  if (payload.tagName !== tagName) {
    throw new Error(`GitHub Release ${tagName} not found`);
  }
  if (!Array.isArray(payload.assets) || !payload.assets.some((asset) => asset.name === zipName)) {
    throw new Error(`GitHub Release ${tagName} is missing ${zipName}`);
  }
}

export function releaseVersion({
  packageRelease = packageReleaseImpl,
  repoDir = defaultRepoDir,
  runCommand = defaultRunCommand,
  version
} = {}) {
  const nextVersion = normalizeVersion(version);
  const tagName = `v${nextVersion}`;
  const extensionDir = join(repoDir, "extension");
  const manifestPath = join(extensionDir, "manifest.json");
  const readmePath = join(repoDir, "README.md");
  const agentsPath = join(repoDir, "AGENTS.md");
  const releasesDir = join(repoDir, "releases");

  assertCleanWorktree({ repoDir, runCommand });
  assertTagAvailable({ repoDir, runCommand, tagName });

  const previousVersion = String(readManifest(manifestPath).version || "").trim();
  const previousTag = `v${previousVersion}`;
  const commitSubjects = runChecked(
    runCommand,
    "git",
    ["log", "--no-merges", "--format=%s", `${previousTag}..HEAD`],
    { cwd: repoDir }
  ).stdout.split(/\r?\n/);
  const releaseNotes = buildReleaseNotes({ commitSubjects, previousTag, tagName });
  updateManifestVersion({ manifestPath, version: nextVersion });
  syncVersionReferences({ agentsPath, manifestPath, readmePath });
  const branch = getCurrentBranch({ repoDir, runCommand });

  runChecked(runCommand, "pnpm", ["run", "check"], { cwd: repoDir, stdio: "inherit" });
  runChecked(runCommand, "pnpm", ["test"], { cwd: repoDir, stdio: "inherit" });
  const releaseAsset = packageRelease({ extensionDir, releasesDir });

  runChecked(runCommand, "git", ["add", "extension/manifest.json", "README.md", "AGENTS.md"], { cwd: repoDir });
  runChecked(runCommand, "git", ["commit", "-m", `chore: 发布 ${nextVersion} 版本`], { cwd: repoDir });
  runChecked(runCommand, "git", ["tag", tagName], { cwd: repoDir });
  runChecked(runCommand, "git", ["push", "origin", branch], { cwd: repoDir, stdio: "inherit" });
  runChecked(runCommand, "git", ["push", "origin", tagName], { cwd: repoDir, stdio: "inherit" });
  assertRemoteTag({ repoDir, runCommand, tagName });
  runChecked(
    runCommand,
    "gh",
    [
      "release",
      "create",
      tagName,
      releaseAsset.outputPath,
      "--repo",
      repository,
      "--title",
      tagName,
      "--notes",
      releaseNotes,
      "--verify-tag",
      "--latest"
    ],
    { cwd: repoDir, stdio: "inherit" }
  );
  assertGitHubRelease({
    repoDir,
    runCommand,
    tagName,
    zipName: releaseAsset.fileName
  });

  return {
    branch,
    fileName: releaseAsset.fileName,
    imageFileName: releaseAsset.imageFileName,
    imageOutputPath: releaseAsset.imageOutputPath,
    outputPath: releaseAsset.outputPath,
    previousVersion,
    tagName,
    version: nextVersion
  };
}

if (resolve(process.argv[1] || "") === scriptPath) {
  const result = releaseVersion({ version: process.argv[2] });
  console.log(`released ${result.tagName} on ${result.branch}`);
  console.log(result.outputPath);
  console.log(result.imageOutputPath);
}
