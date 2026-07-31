import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const defaultRepoDir = resolve(scriptsDir, "..", "..");
const repository = "coldShan/place-fill";

function defaultRunCommand(command, args, { cwd = defaultRepoDir } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe"
  });
  return {
    stderr: result.stderr || "",
    stdout: result.stdout || "",
    status: result.status
  };
}

function runChecked(runCommand, command, args, { cwd = defaultRepoDir } = {}) {
  const result = runCommand(command, args, { cwd }) || {};
  const status = Number(result.status || 0);
  if (status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
  return String(result.stdout || "");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertReadmeVersion({ readmePath, version }) {
  const readme = readFileSync(readmePath, "utf8");
  if (!readme.includes(`版本-v${version}-`)) {
    throw new Error(`README badge does not reference v${version}`);
  }
  if (!readme.includes(`place-fill-v${version}.zip`)) {
    throw new Error(`README release zip does not reference v${version}`);
  }
}

function assertAgentsVersion({ agentsPath, version }) {
  const agents = readFileSync(agentsPath, "utf8");
  if (!agents.includes(`- Current manifest version: \`${version}\` (source: \`extension/manifest.json\`).`)) {
    throw new Error(`AGENTS.md does not reference manifest version ${version}`);
  }
}

function assertDisguisedImage({ carrierPath, imagePath, zipPath }) {
  if (!existsSync(imagePath)) {
    throw new Error(`disguised release image not found: ${imagePath}`);
  }

  const carrier = readFileSync(carrierPath);
  const image = readFileSync(imagePath);
  const zip = readFileSync(zipPath);
  if (
    image.length !== carrier.length + zip.length
    || !image.subarray(0, carrier.length).equals(carrier)
    || !image.subarray(carrier.length).equals(zip)
  ) {
    throw new Error("disguised release image does not contain the current release zip");
  }
}

function assertGitHubRelease({ repoDir, runCommand, tagName, zipName }) {
  let payload;
  try {
    payload = JSON.parse(
      runChecked(runCommand, "gh", ["release", "view", tagName, "--repo", repository, "--json", "tagName,assets"], {
        cwd: repoDir
      })
    );
  } catch {
    throw new Error(`GitHub Release ${tagName} not found`);
  }

  if (payload.tagName !== tagName) {
    throw new Error(`GitHub Release ${tagName} not found`);
  }
  if (!Array.isArray(payload.assets) || !payload.assets.some((asset) => asset.name === zipName)) {
    throw new Error(`GitHub Release ${tagName} is missing ${zipName}`);
  }
}

export function verifyRelease({ repoDir = defaultRepoDir, runCommand = defaultRunCommand } = {}) {
  const extensionDir = join(repoDir, "extension");
  const manifestPath = join(extensionDir, "manifest.json");
  const readmePath = join(repoDir, "README.md");
  const agentsPath = join(repoDir, "AGENTS.md");
  const manifest = readJson(manifestPath);
  const version = String(manifest.version || "").trim();
  const tagName = `v${version}`;
  const zipName = `${manifest.name}-v${version}.zip`;
  const zipPath = join(repoDir, "releases", zipName);
  const imageName = `${manifest.name}.png`;
  const imagePath = join(repoDir, "releases", imageName);
  const carrierPath = join(repoDir, "nodata.png");

  if (!version || !manifest.name) {
    throw new Error("manifest name and version are required");
  }
  assertReadmeVersion({ readmePath, version });
  assertAgentsVersion({ agentsPath, version });
  if (!existsSync(zipPath)) {
    throw new Error(`release zip not found: ${zipPath}`);
  }
  assertDisguisedImage({ carrierPath, imagePath, zipPath });

  const localTag = runChecked(runCommand, "git", ["rev-parse", `refs/tags/${tagName}`], { cwd: repoDir }).trim();
  if (!localTag) {
    throw new Error(`local tag ${tagName} not found`);
  }

  const taggedManifest = readJsonFromGit({ repoDir, runCommand, tagName });
  if (String(taggedManifest.version || "").trim() !== version) {
    throw new Error(`tag ${tagName} does not point to manifest version ${version}`);
  }

  const remoteTag = runChecked(runCommand, "git", ["ls-remote", "--tags", "origin", tagName], { cwd: repoDir }).trim();
  if (!remoteTag.includes(`refs/tags/${tagName}`)) {
    throw new Error(`remote tag ${tagName} not found`);
  }
  assertGitHubRelease({ repoDir, runCommand, tagName, zipName });

  return { imagePath, localTag, tagName, version, zipPath };
}

function readJsonFromGit({ repoDir, runCommand, tagName }) {
  return JSON.parse(
    runChecked(runCommand, "git", ["show", `${tagName}:extension/manifest.json`], { cwd: repoDir })
  );
}

if (resolve(process.argv[1] || "") === scriptPath) {
  const result = verifyRelease();
  console.log(`verified ${result.tagName}`);
  console.log(result.zipPath);
  console.log(result.imagePath);
}
