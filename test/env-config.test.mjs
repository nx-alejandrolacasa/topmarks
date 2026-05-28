import test from "node:test";
import assert from "node:assert/strict";
import {
  createConfigSource,
  escapeJsString,
  parseEnvContent,
} from "../scripts/env-config.mjs";

test("parseEnvContent reads allowlisted values and strips quotes", () => {
  const values = parseEnvContent(
    [
      "UNSPLASH_ACCESS_KEY=\"abc123\"",
      "UNSPLASH_SECRET_KEY=must-not-ship",
      "OTHER=value",
    ].join("\n"),
    ["UNSPLASH_ACCESS_KEY"],
  );

  assert.deepEqual(values, { UNSPLASH_ACCESS_KEY: "abc123" });
});

test("escapeJsString escapes backslashes and quotes", () => {
  assert.equal(escapeJsString('a\\b"c'), 'a\\\\b\\"c');
});

test("createConfigSource writes only public Topmarks config", () => {
  const source = createConfigSource({ UNSPLASH_ACCESS_KEY: "abc123" });

  assert.equal(
    source,
    [
      "// Auto-generated from .env by Topmarks build tooling. Do not edit or commit.",
      'window.TOPMARKS_CONFIG = Object.freeze({"UNSPLASH_ACCESS_KEY":"abc123"});',
      "",
    ].join("\n"),
  );
});
