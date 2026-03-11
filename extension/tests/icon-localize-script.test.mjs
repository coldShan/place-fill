import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { localizeIcons, createLucideIconUrl, collectIconSpecs } from "../scripts/localize-icons.mjs";

test("collectIconSpecs derives unique used icon specs from icon asset paths", () => {
  const specs = collectIconSpecs({
    ICON_PATHS: {
      landmark: "assets/icons/lucide/landmark.svg",
      copy: "assets/icons/lucide/copy.svg",
      duplicate: "assets/icons/lucide/copy.svg"
    }
  });

  assert.deepEqual(specs, [
    { name: "copy", assetPath: "assets/icons/lucide/copy.svg" },
    { name: "landmark", assetPath: "assets/icons/lucide/landmark.svg" }
  ]);
});

test("createLucideIconUrl points to the official raw lucide icon source", () => {
  assert.equal(
    createLucideIconUrl("landmark"),
    "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/landmark.svg"
  );
});

test("localizeIcons downloads only missing local icons by default", async () => {
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-icons-"));
  const existingPath = join(rootDir, "assets/icons/lucide/copy.svg");
  mkdirSync(dirname(existingPath), { recursive: true });
  writeFileSync(existingPath, "<svg>existing</svg>");
  const downloads = [];

  const result = await localizeIcons(
    [
      { name: "copy", assetPath: "assets/icons/lucide/copy.svg" },
      { name: "landmark", assetPath: "assets/icons/lucide/landmark.svg" }
    ],
    {
      rootDir,
      downloadIcon: async function (name) {
        downloads.push(name);
        return "<svg>" + name + "</svg>";
      }
    }
  );

  assert.deepEqual(downloads, ["landmark"]);
  assert.equal(readFileSync(existingPath, "utf8"), "<svg>existing</svg>");
  assert.equal(readFileSync(join(rootDir, "assets/icons/lucide/landmark.svg"), "utf8"), "<svg>landmark</svg>");
  assert.deepEqual(result, {
    downloaded: ["landmark"],
    skipped: ["copy"],
    removed: []
  });
});

test("localizeIcons overwrites existing icons when force is enabled", async () => {
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-icons-force-"));
  const iconPath = join(rootDir, "assets/icons/lucide/copy.svg");
  mkdirSync(dirname(iconPath), { recursive: true });
  writeFileSync(iconPath, "<svg>old</svg>");

  const result = await localizeIcons([{ name: "copy", assetPath: "assets/icons/lucide/copy.svg" }], {
    rootDir,
    force: true,
    downloadIcon: async function (name) {
      return "<svg>" + name + "-new</svg>";
    }
  });

  assert.equal(readFileSync(iconPath, "utf8"), "<svg>copy-new</svg>");
  assert.deepEqual(result, {
    downloaded: ["copy"],
    skipped: [],
    removed: []
  });
});

test("localizeIcons removes unused local lucide svg files", async () => {
  const rootDir = mkdtempSync(join(tmpdir(), "ctdp-icons-prune-"));
  const iconsDir = join(rootDir, "assets/icons/lucide");
  const usedPath = join(iconsDir, "copy.svg");
  const unusedPath = join(iconsDir, "unused.svg");
  const notePath = join(iconsDir, "README.txt");
  mkdirSync(iconsDir, { recursive: true });
  writeFileSync(usedPath, "<svg>copy</svg>");
  writeFileSync(unusedPath, "<svg>unused</svg>");
  writeFileSync(notePath, "keep");

  const result = await localizeIcons([{ name: "copy", assetPath: "assets/icons/lucide/copy.svg" }], {
    rootDir,
    downloadIcon: async function (name) {
      return "<svg>" + name + "</svg>";
    }
  });

  assert.equal(existsSync(usedPath), true);
  assert.equal(existsSync(unusedPath), false);
  assert.equal(readFileSync(notePath, "utf8"), "keep");
  assert.deepEqual(result, {
    downloaded: [],
    skipped: ["copy"],
    removed: ["unused"]
  });
});
