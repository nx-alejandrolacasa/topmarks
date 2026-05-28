import { readFile, writeFile } from "node:fs/promises";

export const ALLOWED_CONFIG_KEYS = ["UNSPLASH_ACCESS_KEY"];

export function parseEnvContent(content, allowedKeys = ALLOWED_CONFIG_KEYS) {
  const allowed = new Set(allowedKeys);
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!allowed.has(key)) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

export function escapeJsString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function createConfigSource(values) {
  const entries = Object.entries(values).map(
    ([key, value]) => `"${key}":"${escapeJsString(value)}"`,
  );

  return [
    "// Auto-generated from .env by Topmarks build tooling. Do not edit or commit.",
    `window.TOPMARKS_CONFIG = Object.freeze({${entries.join(",")}});`,
    "",
  ].join("\n");
}

export async function readEnvFile(envPath) {
  let content;
  try {
    content = await readFile(envPath, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") {
      throw new Error(`.env not found at ${envPath}`);
    }
    throw err;
  }

  const values = parseEnvContent(content);
  for (const key of ALLOWED_CONFIG_KEYS) {
    values[key] ??= "";
  }
  return values;
}

export async function writeConfigFile({ envPath, outPath }) {
  const values = await readEnvFile(envPath);
  await writeFile(outPath, createConfigSource(values));
}
