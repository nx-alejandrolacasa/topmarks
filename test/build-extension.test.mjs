import test from "node:test";
import assert from "node:assert/strict";
import {
  replaceManifestTokens,
  validateGeneratedExtension,
  buildExtension,
} from "../scripts/build-extension.mjs";
import { validateBrowserOutput } from "../scripts/validate-extension-output.mjs";

test("replaceManifestTokens recursively replaces version tokens", () => {
  const manifest = replaceManifestTokens(
    {
      version: "__VERSION__",
      nested: { value: "__VERSION__" },
      permissions: ["storage", "__VERSION__"],
    },
    { version: "1.8.0" },
  );

  assert.deepEqual(manifest, {
    version: "1.8.0",
    nested: { value: "1.8.0" },
    permissions: ["storage", "1.8.0"],
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
    "missing theme-init.js",
    "missing _locales/en/messages.json",
  ]);
});

test("buildExtension rejects unknown browser before path operations", async () => {
  await assert.rejects(
    () => buildExtension({ browser: "../../outside", repoRoot: new URL("../", import.meta.url) }),
    /Unknown browser: \.\.\/\.\.\/outside\. Expected firefox or chrome\./,
  );
});

test("validateBrowserOutput rejects unknown browser before path operations", async () => {
  await assert.rejects(
    () => validateBrowserOutput("../../outside"),
    /Unknown browser: \.\.\/\.\.\/outside\. Expected firefox or chrome\./,
  );
});
