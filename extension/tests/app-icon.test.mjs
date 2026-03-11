import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const iconSourcePath = join(here, "../assets/app-icons/icon-source.svg");
const lucideDir = join(here, "../assets/icons/lucide");
const iconAssetsPath = join(here, "../src/icon-assets.js");

test("extension logo source exists and uses a tight framing for toolbar visibility", () => {
  assert.equal(existsSync(iconSourcePath), true);

  const source = readFileSync(iconSourcePath, "utf8");
  assert.match(source, /viewBox="0 0 128 128"/);
  assert.match(source, /<rect x="6" y="6" width="116" height="116" rx="28"/);
  assert.match(source, /<circle cx="92" cy="92" r="16"/);
});

test("smart fill field icons keep required lucide assets in sync", () => {
  assert.equal(existsSync(join(lucideDir, "building-2.svg")), true);
  assert.equal(existsSync(join(lucideDir, "landmark.svg")), true);
  assert.equal(existsSync(join(lucideDir, "mail.svg")), true);
  assert.equal(existsSync(join(lucideDir, "phone.svg")), true);
  assert.equal(existsSync(join(lucideDir, "map-pinned.svg")), true);
  assert.equal(existsSync(join(lucideDir, "settings.svg")), true);
  assert.equal(existsSync(join(lucideDir, "arrow-left.svg")), true);
});

test("icon asset map uses standalone lucide files instead of inline svg markup", () => {
  const iconAssetsSource = readFileSync(iconAssetsPath, "utf8");

  assert.doesNotMatch(iconAssetsSource, /<svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/landmark\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/building-2\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/mail\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/phone\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/map-pinned\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/settings\.svg/);
  assert.match(iconAssetsSource, /assets\/icons\/lucide\/arrow-left\.svg/);
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
