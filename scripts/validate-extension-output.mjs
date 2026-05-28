import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateGeneratedExtension } from "./build-extension.mjs";

export async function validateBrowserOutput(browser, repoRoot = process.cwd()) {
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
  validateBrowserOutput(browser).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
