import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../src/sidepanel.css"), "utf8");

test("card copied feedback only animates activation, not deactivation transitions", () => {
  assert.match(stylesheet, /\.ctdp-card\s*\{[^}]*transition:\s*transform 160ms ease;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-card\s*\{[^}]*background-color 160ms ease/);
  assert.doesNotMatch(stylesheet, /\.ctdp-card\s*\{[^}]*box-shadow 160ms ease/);
  assert.match(stylesheet, /\.ctdp-card\[data-copied="true"\]\s*\{[^}]*animation:\s*ctdp-copied-pulse 420ms ease;/);
});
