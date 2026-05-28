import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createConfigSource,
  escapeJsString,
  parseEnvContent,
  readEnvFile,
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

test("readEnvFile allows a blank optional UNSPLASH_ACCESS_KEY", async () => {
  const testDir = new URL(".", import.meta.url).pathname;
  const dir = await mkdtemp(path.join(testDir, "tmp-env-"));
  const envPath = path.join(dir, ".env");
  try {
    await writeFile(envPath, "UNSPLASH_ACCESS_KEY=\n");
    await assert.deepEqual(await readEnvFile(envPath), {
      UNSPLASH_ACCESS_KEY: "",
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
