import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const iconSourcePath = join(here, "../extension/assets/app-icons/icon-source.png");
const lucideDir = join(here, "../extension/assets/icons/lucide");
const iconAssetsPath = join(here, "../extension/src/icon-assets.js");

test("extension logo source exists as a local png asset for app icon generation", () => {
  assert.equal(existsSync(iconSourcePath), true);
});

test("smart fill field icons keep required lucide assets in sync", () => {
  assert.equal(existsSync(join(lucideDir, "building-2.svg")), true);
  assert.equal(existsSync(join(lucideDir, "download.svg")), true);
  assert.equal(existsSync(join(lucideDir, "github.svg")), true);
  assert.equal(existsSync(join(lucideDir, "landmark.svg")), true);
  assert.equal(existsSync(join(lucideDir, "list-filter.svg")), true);
  assert.equal(existsSync(join(lucideDir, "mail.svg")), true);
  assert.equal(existsSync(join(lucideDir, "phone.svg")), true);
  assert.equal(existsSync(join(lucideDir, "map-pinned.svg")), true);
  assert.equal(existsSync(join(lucideDir, "settings.svg")), true);
  assert.equal(existsSync(join(lucideDir, "shield.svg")), true);
  assert.equal(existsSync(join(lucideDir, "arrow-left.svg")), true);
  assert.equal(existsSync(join(lucideDir, "upload.svg")), true);
});

test("icon asset map uses standalone lucide files instead of inline svg markup", () => {
  const iconAssetsSource = readFileSync(iconAssetsPath, "utf8");

  assert.doesNotMatch(iconAssetsSource, /<svg/);
  assert.match(iconAssetsSource, /const PRIMARY_LOGO_ICON = "app-logo"/);
  assert.match(iconAssetsSource, /"app-logo": "assets\/app-icons\/icon-128\.png"/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/landmark\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/building-2\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/download\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/github\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/mail\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/list-filter\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/phone\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/map-pinned\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/settings\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/shield\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/arrow-left\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/upload\.svg/);
  assert.match(iconAssetsSource, /getURL/);
});

test("landmark icon matches the official lucide shape in file asset", () => {
  const landmarkSource = readFileSync(join(lucideDir, "landmark.svg"), "utf8");

  assert.match(landmarkSource, /M11\.12 2\.198a2 2 0 0 1 1\.76\.006/);
});

test("building-2 icon matches the official lucide shape in file asset", () => {
  const buildingSource = readFileSync(join(lucideDir, "building-2.svg"), "utf8");

  assert.match(buildingSource, /M14 21v-3a2 2 0 0 0-4 0v3/);
});

test("credit-card icon matches the official lucide shape in file asset", () => {
  const creditCardSource = readFileSync(join(lucideDir, "credit-card.svg"), "utf8");

  assert.match(creditCardSource, /<line x1="2" x2="22" y1="10" y2="10"/);
});
