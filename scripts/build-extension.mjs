import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeConfigFile } from "./env-config.mjs";

export const ALLOWED_BROWSERS = new Set(["firefox", "chrome"]);

const REQUIRED_OUTPUT_FILES = [
  "manifest.json",
  "newtab.html",
  "app.js",
  "adapter.js",
  "config.local.js",
  "newtab.css",
  "theme-init.js",
  "_locales/en/messages.json",
];

export function replaceManifestTokens(value, tokens) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceManifestTokens(item, tokens));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        replaceManifestTokens(nested, tokens),
      ]),
    );
  }
  if (typeof value === "string") {
    return value.replaceAll("__VERSION__", tokens.version);
  }
  return value;
}

async function copyIfExists(from, to) {
  if (!existsSync(from)) return;
  await cp(from, to, { recursive: true });
}

export async function validateGeneratedExtension(distDir) {
  const basePath =
    distDir instanceof URL ? fileURLToPath(distDir) : path.resolve(String(distDir));
  const messages = [];

  for (const file of REQUIRED_OUTPUT_FILES) {
    if (!existsSync(path.join(basePath, file))) {
      messages.push(`missing ${file}`);
    }
  }

  return messages;
}

export async function buildExtension({ browser, repoRoot = process.cwd() }) {
  if (!ALLOWED_BROWSERS.has(browser)) {
    throw new Error(`Unknown browser: ${browser}. Expected firefox or chrome.`);
  }
  const root = path.resolve(repoRoot);
  const packageDir = path.join(root, "packages", browser);
  const sharedDir = path.join(root, "packages", "shared");
  const distDir = path.join(packageDir, "dist");
  const rootPackage = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const manifestTemplate = JSON.parse(
    await readFile(path.join(packageDir, "manifest.template.json"), "utf8"),
  );

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await cp(path.join(sharedDir, "src"), distDir, { recursive: true });
  await copyIfExists(path.join(sharedDir, "assets", "icons"), path.join(distDir, "icons"));
  await copyIfExists(path.join(sharedDir, "assets", "fonts"), path.join(distDir, "fonts"));
  await copyIfExists(path.join(sharedDir, "assets", "_locales"), path.join(distDir, "_locales"));
  await cp(path.join(packageDir, "src", "adapter.js"), path.join(distDir, "adapter.js"));

  await writeConfigFile({
    envPath: path.join(root, ".env"),
    outPath: path.join(distDir, "config.local.js"),
  });

  const manifest = replaceManifestTokens(manifestTemplate, {
    version: rootPackage.version,
  });
  await writeFile(path.join(distDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const validationMessages = await validateGeneratedExtension(distDir);
  if (validationMessages.length > 0) {
    throw new Error(
      `Generated ${browser} extension is incomplete:\n${validationMessages.join("\n")}`,
    );
  }

  return { distDir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const browser = process.argv[2];
  if (!browser) {
    console.error("Usage: node scripts/build-extension.mjs <firefox|chrome>");
    process.exit(1);
  }
  buildExtension({ browser }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
