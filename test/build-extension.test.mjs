import test from "node:test";
import assert from "node:assert/strict";
import {
  replaceManifestTokens,
  validateGeneratedExtension,
} from "../scripts/build-extension.mjs";

test("replaceManifestTokens recursively replaces version tokens", () => {
  const manifest = replaceManifestTokens(
    {
      version: "__VERSION__",
      nested: { value: "__VERSION__" },
      permissions: ["storage"],
    },
    { version: "1.8.0" },
  );

  assert.deepEqual(manifest, {
    version: "1.8.0",
    nested: { value: "1.8.0" },
    permissions: ["storage"],
  });
});

test("validateGeneratedExtension reports missing required files", async () => {
  const messages = await validateGeneratedExtension(new URL("missing-dist/", import.meta.url));

  assert.deepEqual(messages, [
    "missing manifest.json",
    "missing newtab.html",
    "missing app.js",
    "missing adapter.js",
    "missing config.local.js",
    "missing newtab.css",
  ]);
});
