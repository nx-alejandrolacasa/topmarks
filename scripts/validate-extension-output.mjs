import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ALLOWED_BROWSERS, validateGeneratedExtension } from "./build-extension.mjs";

export async function validateBrowserOutput(browser, repoRoot = process.cwd()) {
  if (!ALLOWED_BROWSERS.has(browser)) {
    throw new Error(`Unknown browser: ${browser}. Expected firefox or chrome.`);
  }
  const distDir = path.join(repoRoot, "packages", browser, "dist");
  const messages = await validateGeneratedExtension(distDir);
  if (messages.length > 0) {
    throw new Error(`${browser} dist validation failed:\n${messages.join("\n")}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const browser = process.argv[2];
  if (!browser) {
    console.error("Usage: node scripts/validate-extension-output.mjs <firefox|chrome>");
    process.exit(1);
  }
  // Resolve repoRoot from the script location so the command works correctly
  // regardless of which package directory it is invoked from.
  const scriptRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  validateBrowserOutput(browser, scriptRepoRoot).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
