import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, "../packages/chrome/manifest.template.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

test("Chrome manifest icons reference PNG files, not SVG", () => {
  const icons = manifest.icons;
  assert.ok(icons, "manifest.icons should exist");

  for (const [size, path] of Object.entries(icons)) {
    assert.match(
      path,
      /\.png$/,
      `icons["${size}"] should end with .png but got "${path}"`,
    );
  }
});
