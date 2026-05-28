# Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Topmarks into an npm-workspaces monorepo with small Firefox and Chrome extension packages that share the new-tab runtime, assets, localization, and build tooling.

**Architecture:** `packages/shared` owns browser-independent source files and assets. `packages/firefox` and `packages/chrome` each provide only a manifest template, browser adapter, and tiny package scripts that assemble a generated `dist/` extension. Shared runtime code talks to extension APIs through `window.TopmarksBrowserAdapter`.

**Tech Stack:** npm workspaces, Node 22, vanilla JavaScript, WebExtensions APIs, Firefox Manifest V2, Chrome Manifest V3, `web-ext`.

---

## File structure

Create and modify these files:

- Modify: `package.json` — root workspace scripts and package metadata.
- Modify: `package-lock.json` — npm workspace lockfile after `npm install --package-lock-only`.
- Modify: `.gitignore` — ignore generated package `dist/` folders.
- Create: `scripts/env-config.mjs` — shared env parsing and config source generation helpers.
- Create: `scripts/build-extension.mjs` — shared extension assembly helper.
- Create: `scripts/validate-extension-output.mjs` — static validation for generated browser outputs.
- Create: `test/env-config.test.mjs` — Node built-in tests for env parsing and config generation.
- Create: `test/build-extension.test.mjs` — Node built-in tests for manifest token replacement and generated output checks.
- Create: `packages/shared/package.json` — shared package metadata.
- Move: `newtab.html` to `packages/shared/src/newtab.html` — shared new-tab shell, updated to load `adapter.js`.
- Move: `newtab.css` to `packages/shared/src/newtab.css` — shared styles.
- Move: `theme-init.js` to `packages/shared/src/theme-init.js` — shared pre-CSS theme init.
- Move: `newtab.js` to `packages/shared/src/app.js` — shared runtime, refactored to use the browser adapter.
- Move: `fonts/` to `packages/shared/assets/fonts/`.
- Move: `icons/` to `packages/shared/assets/icons/`.
- Move: `_locales/` to `packages/shared/assets/_locales/`.
- Create: `packages/firefox/package.json` — Firefox build, lint, package scripts.
- Create: `packages/firefox/manifest.template.json` — Firefox Manifest V2 template.
- Create: `packages/firefox/src/adapter.js` — Firefox adapter.
- Create: `packages/firefox/scripts/build.mjs` — tiny browser package build entrypoint.
- Move: `web-ext-config.cjs` to `packages/firefox/web-ext-config.cjs` — Firefox lint/build config.
- Create: `packages/chrome/package.json` — Chrome build, lint, package scripts.
- Create: `packages/chrome/manifest.template.json` — Chrome Manifest V3 template.
- Create: `packages/chrome/src/adapter.js` — Chrome adapter.
- Create: `packages/chrome/scripts/build.mjs` — tiny browser package build entrypoint.
- Modify: `README.md` — monorepo setup and browser-specific development instructions.
- Modify: `PRIVACY.md` — browser-neutral privacy policy and search/favicon permission notes.
- Modify: `LISTING.md` — listing copy for Firefox and Chrome variants.
- Modify: `.github/workflows/release.yml` — build generated Firefox and Chrome outputs from workspaces.
- Remove: `build-config.sh` — replaced by Node config generation.
- Remove from root after moves: `manifest.json`, `newtab.html`, `newtab.css`, `newtab.js`, `theme-init.js`, `fonts/`, `icons/`, `_locales/`, `web-ext-config.cjs`.

## Task 1: Add workspace scaffold and baseline tests

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `test/env-config.test.mjs`
- Create: `test/build-extension.test.mjs`
- Modify: `package-lock.json`

- [ ] **Step 1: Write failing env/config tests**

Create `test/env-config.test.mjs`:

```js
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
```

- [ ] **Step 2: Write failing build helper tests**

Create `test/build-extension.test.mjs`:

```js
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test
```

Expected: the command fails because `npm test`, `scripts/env-config.mjs`, and `scripts/build-extension.mjs` do not exist yet.

- [ ] **Step 4: Update root package metadata**

Replace `package.json` with:

```json
{
  "name": "topmarks",
  "version": "1.8.0",
  "private": true,
  "license": "MIT",
  "description": "Browser new-tab extension that floats your bookmarks toolbar at the top with a rotating Unsplash wallpaper.",
  "workspaces": [
    "packages/*"
  ],
  "engines": {
    "node": "22.x"
  },
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "build:firefox": "npm run build -w @topmarks/firefox",
    "build:chrome": "npm run build -w @topmarks/chrome",
    "lint": "npm run lint --workspaces --if-present",
    "lint:firefox": "npm run lint -w @topmarks/firefox",
    "lint:chrome": "npm run lint -w @topmarks/chrome",
    "test": "node --test test/*.test.mjs",
    "validate": "npm test && npm run build && npm run lint"
  },
  "devDependencies": {
    "web-ext": "^10.1.0"
  }
}
```

- [ ] **Step 5: Ignore generated package outputs**

Append to `.gitignore`:

```gitignore

# Generated extension outputs
packages/*/dist/
packages/*/web-ext-artifacts/
```

- [ ] **Step 6: Refresh the npm lockfile**

Run:

```bash
npm install --package-lock-only
```

Expected: `package-lock.json` updates to lock the workspace root metadata without installing new dependencies.

- [ ] **Step 7: Commit scaffold tests and root workspace metadata**

Run:

```bash
git add package.json package-lock.json .gitignore test/env-config.test.mjs test/build-extension.test.mjs
git commit -m "Add monorepo workspace scaffold tests" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds. The tests still fail because helper scripts are introduced in Task 2.

## Task 2: Add shared build and config helpers

**Files:**
- Create: `scripts/env-config.mjs`
- Create: `scripts/build-extension.mjs`
- Create: `scripts/validate-extension-output.mjs`
- Modify: `test/build-extension.test.mjs`

- [ ] **Step 1: Implement env config helper**

Create `scripts/env-config.mjs`:

```js
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
  if (!values.UNSPLASH_ACCESS_KEY) {
    throw new Error("UNSPLASH_ACCESS_KEY is missing from .env");
  }
  return values;
}

export async function writeConfigFile({ envPath, outPath }) {
  const values = await readEnvFile(envPath);
  await writeFile(outPath, createConfigSource(values));
}
```

- [ ] **Step 2: Implement build helper**

Create `scripts/build-extension.mjs`:

```js
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeConfigFile } from "./env-config.mjs";

const REQUIRED_OUTPUT_FILES = [
  "manifest.json",
  "newtab.html",
  "app.js",
  "adapter.js",
  "config.local.js",
  "newtab.css",
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
```

- [ ] **Step 3: Implement output validation CLI**

Create `scripts/validate-extension-output.mjs`:

```js
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
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm test
```

Expected: both Node test files pass.

- [ ] **Step 5: Commit build helpers**

Run:

```bash
git add scripts/env-config.mjs scripts/build-extension.mjs scripts/validate-extension-output.mjs test/env-config.test.mjs test/build-extension.test.mjs
git commit -m "Add shared extension build helpers" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds.

## Task 3: Move shared source and build Firefox from it

**Files:**
- Create: `packages/shared/package.json`
- Move: `newtab.html` to `packages/shared/src/newtab.html`
- Move: `newtab.css` to `packages/shared/src/newtab.css`
- Move: `theme-init.js` to `packages/shared/src/theme-init.js`
- Move: `newtab.js` to `packages/shared/src/app.js`
- Move: `fonts/` to `packages/shared/assets/fonts/`
- Move: `icons/` to `packages/shared/assets/icons/`
- Move: `_locales/` to `packages/shared/assets/_locales/`
- Create: `packages/firefox/package.json`
- Create: `packages/firefox/manifest.template.json`
- Create: `packages/firefox/src/adapter.js`
- Create: `packages/firefox/scripts/build.mjs`
- Move: `web-ext-config.cjs` to `packages/firefox/web-ext-config.cjs`
- Modify: `packages/shared/src/newtab.html`
- Modify: `packages/shared/src/app.js`
- Modify: `package-lock.json`
- Remove: `manifest.json`
- Remove: `build-config.sh`

- [ ] **Step 1: Create shared package metadata**

Create `packages/shared/package.json`:

```json
{
  "name": "@topmarks/shared",
  "version": "1.8.0",
  "private": true,
  "description": "Shared Topmarks new-tab runtime, styles, assets, and locales."
}
```

- [ ] **Step 2: Move shared runtime and assets**

Run:

```bash
mkdir -p packages/shared/src packages/shared/assets
git mv newtab.html packages/shared/src/newtab.html
git mv newtab.css packages/shared/src/newtab.css
git mv theme-init.js packages/shared/src/theme-init.js
git mv newtab.js packages/shared/src/app.js
git mv fonts packages/shared/assets/fonts
git mv icons packages/shared/assets/icons
git mv _locales packages/shared/assets/_locales
```

Expected: git records the files as moved.

- [ ] **Step 3: Update shared HTML to load adapter before app**

In `packages/shared/src/newtab.html`, replace the bottom script block:

```html
    <script src="config.local.js"></script>
    <script src="newtab.js"></script>
```

with:

```html
    <script src="config.local.js"></script>
    <script src="adapter.js"></script>
    <script src="app.js"></script>
```

- [ ] **Step 4: Update shared app to read generated config object**

Near the top of `packages/shared/src/app.js`, after constants are declared, add:

```js
const TOPMARKS_CONFIG = window.TOPMARKS_CONFIG || {};
const UNSPLASH_ACCESS_KEY = TOPMARKS_CONFIG.UNSPLASH_ACCESS_KEY || "";
```

Keep `hasUnsplashKey()` unchanged because it already reads `UNSPLASH_ACCESS_KEY`.

- [ ] **Step 5: Create Firefox package metadata**

Run:

```bash
mkdir -p packages/firefox/src packages/firefox/scripts
```

Create `packages/firefox/package.json`:

```json
{
  "name": "@topmarks/firefox",
  "version": "1.8.0",
  "private": true,
  "description": "Firefox Manifest V2 build of Topmarks.",
  "scripts": {
    "build": "node scripts/build.mjs",
    "lint": "npm run build && web-ext lint --source-dir dist --config web-ext-config.cjs",
    "package": "npm run build && web-ext build --source-dir dist --config web-ext-config.cjs --overwrite-dest"
  }
}
```

- [ ] **Step 6: Create Firefox manifest template**

Create `packages/firefox/manifest.template.json`:

```json
{
  "manifest_version": 2,
  "default_locale": "en",
  "name": "__MSG_extName__",
  "version": "__VERSION__",
  "description": "__MSG_extDescription__",
  "homepage_url": "https://github.com/nx-alejandrolacasa/topmarks",
  "developer": {
    "name": "Alejandro Lacasa",
    "url": "https://github.com/nx-alejandrolacasa"
  },
  "permissions": [
    "bookmarks",
    "storage",
    "search",
    "https://api.unsplash.com/*"
  ],
  "icons": {
    "48": "icons/icon.svg",
    "96": "icons/icon.svg",
    "128": "icons/icon.svg"
  },
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "topmarks@nx-alejandrolacasa.github.io",
      "strict_min_version": "142.0",
      "data_collection_permissions": {
        "required": ["none"]
      }
    }
  }
}
```

- [ ] **Step 7: Create temporary Firefox adapter pass-through**

Create `packages/firefox/src/adapter.js`:

```js
window.TopmarksBrowserAdapter = {
  browser,
};
```

This temporary adapter allows the Firefox build to load while Task 4 refactors shared app code to use the stable adapter methods.

- [ ] **Step 8: Create Firefox build entrypoint**

Create `packages/firefox/scripts/build.mjs`:

```js
import { buildExtension } from "../../../scripts/build-extension.mjs";

await buildExtension({ browser: "firefox" });
```

- [ ] **Step 9: Move and update web-ext config**

Run:

```bash
git mv web-ext-config.cjs packages/firefox/web-ext-config.cjs
```

Then replace `packages/firefox/web-ext-config.cjs` with:

```js
module.exports = {
  build: {
    filename: "topmarks-firefox-v{version}.zip",
    overwriteDest: true,
    artifactsDir: "web-ext-artifacts",
  },
  ignoreFiles: [
    "web-ext-artifacts/**",
  ],
};
```

- [ ] **Step 10: Remove obsolete root files and refresh workspace lockfile**

Run:

```bash
git rm manifest.json build-config.sh
npm install --package-lock-only
```

Expected: obsolete root Firefox-only files are removed and `package-lock.json` includes `packages/shared` and `packages/firefox`.

- [ ] **Step 11: Build Firefox output**

Run:

```bash
npm run build:firefox
```

Expected: command succeeds and creates `packages/firefox/dist/manifest.json`, `newtab.html`, `app.js`, `adapter.js`, `config.local.js`, `newtab.css`, `icons/`, `fonts/`, and `_locales/`. If `.env` is missing, create it from `.env.example` with a valid public Unsplash access key before rerunning.

- [ ] **Step 12: Run Firefox lint**

Run:

```bash
npm run lint:firefox
```

Expected: `web-ext lint` passes against `packages/firefox/dist`.

- [ ] **Step 13: Commit shared move and Firefox package**

Run:

```bash
git add package.json package-lock.json packages/shared packages/firefox
git add -u manifest.json build-config.sh newtab.html newtab.css newtab.js theme-init.js fonts icons _locales web-ext-config.cjs
git commit -m "Move Firefox extension into shared workspace build" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds.

## Task 4: Introduce browser adapter boundary in shared runtime

**Files:**
- Modify: `packages/shared/src/app.js`
- Modify: `packages/firefox/src/adapter.js`

- [ ] **Step 1: Replace temporary Firefox adapter with stable methods**

Replace `packages/firefox/src/adapter.js` with:

```js
(function () {
  const TOOLBAR_ID = "toolbar_____";

  function faviconSources(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return [];
      return [`page-icon:${url}`, `${u.origin}/favicon.ico`];
    } catch {
      return [];
    }
  }

  async function getToolbarBookmarks() {
    const [toolbar] = await browser.bookmarks.getSubTree(TOOLBAR_ID);
    return toolbar.children || [];
  }

  async function search(query, { newTab = false } = {}) {
    if (newTab) {
      const tab = await browser.tabs.create({ url: "about:blank", active: true });
      await browser.search.search({ query, tabId: tab.id });
      return;
    }
    const current = await browser.tabs.getCurrent();
    await browser.search.search({ query, tabId: current.id });
  }

  window.TopmarksBrowserAdapter = {
    getMessage(key) {
      return browser.i18n.getMessage(key);
    },
    getUILanguage() {
      return browser.i18n.getUILanguage();
    },
    storageGet(keysOrDefaults) {
      return browser.storage.local.get(keysOrDefaults);
    },
    storageSet(values) {
      return browser.storage.local.set(values);
    },
    onStorageChanged(listener) {
      browser.storage.onChanged.addListener(listener);
    },
    getToolbarBookmarks,
    onBookmarksChanged(listener) {
      const events = ["onCreated", "onRemoved", "onChanged", "onMoved"];
      for (const eventName of events) {
        const event = browser.bookmarks[eventName];
        if (event) event.addListener(listener);
      }
    },
    search,
    faviconSources,
  };
})();
```

- [ ] **Step 2: Add adapter guard to shared app**

At the top of `packages/shared/src/app.js`, replace:

```js
const TOOLBAR_ID = "toolbar_____";
```

with:

```js
const adapter = window.TopmarksBrowserAdapter;
if (!adapter) {
  throw new Error("Topmarks browser adapter is not loaded");
}
```

- [ ] **Step 3: Remove Firefox-specific favicon helper from shared app**

Delete the existing `faviconSources(url)` function from `packages/shared/src/app.js`.

In `createBookmarkLink(node)`, replace:

```js
  const sources = faviconSources(node.url);
```

with:

```js
  const sources = adapter.faviconSources(node.url);
```

- [ ] **Step 4: Route i18n through adapter**

Replace the current `t(key)` function with:

```js
function t(key) {
  try {
    const msg = adapter.getMessage(key);
    if (msg) return msg;
  } catch (err) {
    console.warn("[Topmarks] i18n lookup failed:", err);
  }
  return key;
}
```

In `applyI18n()`, replace:

```js
    const lang = browser.i18n.getUILanguage();
```

with:

```js
    const lang = adapter.getUILanguage();
```

- [ ] **Step 5: Route bookmarks through adapter**

In `renderBookmarks()`, replace:

```js
    const [toolbar] = await browser.bookmarks.getSubTree(TOOLBAR_ID);
    const items = toolbar.children || [];
```

with:

```js
    const items = await adapter.getToolbarBookmarks();
```

At the bottom of the file, replace:

```js
const bookmarkEvents = ["onCreated", "onRemoved", "onChanged", "onMoved"];
for (const ev of bookmarkEvents) {
  if (browser.bookmarks[ev]) browser.bookmarks[ev].addListener(renderBookmarks);
}
```

with:

```js
adapter.onBookmarksChanged(renderBookmarks);
```

- [ ] **Step 6: Route storage through adapter**

Replace all `browser.storage.local.get(` calls with `adapter.storageGet(`.

Replace all `browser.storage.local.set(` calls with `adapter.storageSet(`.

Replace:

```js
if (browser.storage?.onChanged) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.unsplashBackoff) {
      updateBackgroundErrorVisibility();
    }
  });
}
```

with:

```js
adapter.onStorageChanged((changes, area) => {
  if (area === "local" && changes.unsplashBackoff) {
    updateBackgroundErrorVisibility();
  }
});
```

- [ ] **Step 7: Route search through adapter**

In `setupSearch()`, replace the `try` body that creates tabs and calls `browser.search.search` with:

```js
        await adapter.search(query, { newTab: inNewTab });
```

Keep the existing catch block:

```js
      } catch (err) {
        console.error("[Topmarks] Search submit failed:", err);
      }
```

- [ ] **Step 8: Verify no direct browser API calls remain in shared app**

Run:

```bash
rg "browser\\." packages/shared/src/app.js
```

Expected: no matches.

- [ ] **Step 9: Build and lint Firefox**

Run:

```bash
npm run build:firefox
npm run lint:firefox
```

Expected: both commands pass.

- [ ] **Step 10: Commit adapter boundary**

Run:

```bash
git add packages/shared/src/app.js packages/firefox/src/adapter.js
git commit -m "Add browser adapter boundary for shared runtime" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds.

## Task 5: Add Chrome package and Chrome adapter

**Files:**
- Create: `packages/chrome/package.json`
- Create: `packages/chrome/manifest.template.json`
- Create: `packages/chrome/src/adapter.js`
- Create: `packages/chrome/scripts/build.mjs`
- Modify: `package-lock.json`

- [ ] **Step 1: Create Chrome package metadata**

Run:

```bash
mkdir -p packages/chrome/src packages/chrome/scripts
```

Create `packages/chrome/package.json`:

```json
{
  "name": "@topmarks/chrome",
  "version": "1.8.0",
  "private": true,
  "description": "Chrome Manifest V3 build of Topmarks.",
  "scripts": {
    "build": "node scripts/build.mjs",
    "lint": "npm run build && node ../../scripts/validate-extension-output.mjs chrome",
    "package": "npm run build"
  }
}
```

- [ ] **Step 2: Create Chrome manifest template**

Create `packages/chrome/manifest.template.json`:

```json
{
  "manifest_version": 3,
  "default_locale": "en",
  "name": "__MSG_extName__",
  "version": "__VERSION__",
  "description": "__MSG_extDescription__",
  "homepage_url": "https://github.com/nx-alejandrolacasa/topmarks",
  "icons": {
    "48": "icons/icon.svg",
    "96": "icons/icon.svg",
    "128": "icons/icon.svg"
  },
  "permissions": [
    "bookmarks",
    "storage",
    "search",
    "favicon"
  ],
  "host_permissions": [
    "https://api.unsplash.com/*"
  ],
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  }
}
```

- [ ] **Step 3: Create Chrome build entrypoint**

Create `packages/chrome/scripts/build.mjs`:

```js
import { buildExtension } from "../../../scripts/build-extension.mjs";

await buildExtension({ browser: "chrome" });
```

- [ ] **Step 4: Create Chrome adapter**

Create `packages/chrome/src/adapter.js`:

```js
(function () {
  function promisify(fn, thisArg, ...args) {
    return new Promise((resolve, reject) => {
      fn.call(thisArg, ...args, (result) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(result);
      });
    });
  }

  function faviconSources(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return [];
      const internal = new URL(chrome.runtime.getURL("/_favicon/"));
      internal.searchParams.set("pageUrl", url);
      internal.searchParams.set("size", "32");
      return [internal.toString(), `${u.origin}/favicon.ico`];
    } catch {
      return [];
    }
  }

  async function storageGet(keysOrDefaults) {
    if (chrome.storage.local.get.length === 1) {
      return chrome.storage.local.get(keysOrDefaults);
    }
    return promisify(chrome.storage.local.get, chrome.storage.local, keysOrDefaults);
  }

  async function storageSet(values) {
    if (chrome.storage.local.set.length === 1) {
      return chrome.storage.local.set(values);
    }
    return promisify(chrome.storage.local.set, chrome.storage.local, values);
  }

  async function getToolbarBookmarks() {
    const tree = chrome.bookmarks.getTree.length === 0
      ? await chrome.bookmarks.getTree()
      : await promisify(chrome.bookmarks.getTree, chrome.bookmarks);
    const root = tree[0];
    const children = root?.children || [];
    const bar =
      children.find((node) => node.id === "1") ||
      children.find((node) => /bookmarks bar/i.test(node.title || "")) ||
      children[0];
    return bar?.children || [];
  }

  async function search(query, { newTab = false } = {}) {
    if (!chrome.search?.query) {
      throw new Error("chrome.search.query is unavailable");
    }
    const details = {
      text: query,
      disposition: newTab ? "NEW_TAB" : "CURRENT_TAB",
    };
    if (chrome.search.query.length === 1) {
      await chrome.search.query(details);
      return;
    }
    await promisify(chrome.search.query, chrome.search, details);
  }

  window.TopmarksBrowserAdapter = {
    getMessage(key) {
      return chrome.i18n.getMessage(key);
    },
    getUILanguage() {
      return chrome.i18n.getUILanguage();
    },
    storageGet,
    storageSet,
    onStorageChanged(listener) {
      chrome.storage.onChanged.addListener(listener);
    },
    getToolbarBookmarks,
    onBookmarksChanged(listener) {
      const events = ["onCreated", "onRemoved", "onChanged", "onMoved"];
      for (const eventName of events) {
        const event = chrome.bookmarks[eventName];
        if (event) event.addListener(listener);
      }
    },
    search,
    faviconSources,
  };
})();
```

- [ ] **Step 5: Refresh workspace lockfile**

Run:

```bash
npm install --package-lock-only
```

Expected: `package-lock.json` includes `packages/chrome`.

- [ ] **Step 6: Build and lint Chrome**

Run:

```bash
npm run build:chrome
npm run lint:chrome
```

Expected: both commands pass and `packages/chrome/dist/manifest.json` contains `"manifest_version": 3`.

- [ ] **Step 7: Run all tests**

Run:

```bash
npm test
```

Expected: Node tests pass.

- [ ] **Step 8: Commit Chrome package**

Run:

```bash
git add packages/chrome package-lock.json
git commit -m "Add Chrome extension package" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds.

## Task 6: Update documentation, listing copy, privacy copy, and release workflow

**Files:**
- Modify: `README.md`
- Modify: `PRIVACY.md`
- Modify: `LISTING.md`
- Modify: `.github/workflows/release.yml`
- Modify: `.env.example`

- [ ] **Step 1: Update README project description**

In `README.md`, replace the opening description with:

```markdown
A minimal browser new-tab extension for Firefox and Chrome that floats your bookmarks toolbar at the top of every new tab, over a rotating Unsplash wallpaper.
```

Replace the old "Firefox only" line with:

```markdown
Topmarks ships as separate Firefox and Chrome extension packages from the same shared source.
```

- [ ] **Step 2: Replace README project structure section**

Replace the existing project structure block with:

````markdown
## Project structure

```text
packages/shared/          Shared new-tab HTML, CSS, runtime, assets, and locales
packages/firefox/         Firefox Manifest V2 adapter, manifest, and web-ext config
packages/chrome/          Chrome Manifest V3 adapter and manifest
scripts/                  Shared build/config/validation helpers
test/                     Node built-in tests for build helpers
.env.example              Template — copy to .env, fill in, gitignored
PRIVACY.md                Privacy policy
```
````

- [ ] **Step 3: Replace README setup and development commands**

Update README setup/development commands to:

````markdown
## Setup

1. Get an Unsplash Access Key at <https://unsplash.com/oauth/applications>. Only the **Access Key** is needed — the Secret Key must never be placed in client-side code.
2. Configure:

   ```sh
   cp .env.example .env
   # paste your UNSPLASH_ACCESS_KEY into .env
   npm install
   npm run build
   ```

The build writes a gitignored `config.local.js` into each generated browser `dist/` folder. Re-run `npm run build` after editing `.env`.

## Install in Firefox (development)

1. Run `npm run build:firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Pick `packages/firefox/dist/manifest.json`.
5. Open a new tab.

## Install in Chrome (development)

1. Run `npm run build:chrome`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Pick `packages/chrome/dist`.
6. Open a new tab.

## Development

- Run `npm test` for build-helper tests.
- Run `npm run build` to generate both browser outputs.
- Run `npm run lint` to validate generated browser outputs.
- In Firefox, reload from `about:debugging` after rebuilding.
- In Chrome, click **Reload** on the unpacked extension after rebuilding.
```
````

- [ ] **Step 4: Update privacy policy browser wording and permissions**

In `PRIVACY.md`, replace Firefox-only phrasing with browser-neutral wording:

```markdown
This policy explains what data the **Topmarks** browser extension (the "extension") handles, what is transmitted off your device, and how you can control it. It applies to the Firefox and Chrome versions distributed from this source code.
```

In the summary, replace:

```markdown
- The extension reads your Firefox bookmarks toolbar locally and displays it on every new tab page.
```

with:

```markdown
- The extension reads your browser bookmarks toolbar locally and displays it on every new tab page.
```

In the permissions table, include:

```markdown
| `search` | Submit queries from the new-tab search field to your browser's default search engine. Search terms are sent only to the search engine already configured in your browser. |
| `favicon` (Chrome only) | Read favicons from Chrome's internal favicon store for bookmarked pages. |
```

- [ ] **Step 5: Update listing copy**

In `LISTING.md`, change AMO-specific heading to browser-neutral sections:

```markdown
# Store listing copy

Text to paste into Firefox Add-ons and Chrome Web Store submission forms. Keep this in sync with the actual extension behavior.
```

Update feature bullets to mention both Firefox and Chrome:

```markdown
**Topmarks** floats your bookmarks toolbar at the top of every new tab in Firefox or Chrome, over a rotating wallpaper from Unsplash. Designed to be minimal, fast, and unobtrusive.
```

Add a Chrome reviewer note:

````markdown
## Chrome notes for reviewer

```text
This Manifest V3 extension reads the bookmarks bar via the bookmarks API and renders it on the new tab page. The only network destination is api.unsplash.com when "Show background image" is enabled. Favicons are loaded from Chrome's internal favicon store first, falling back to each bookmarked site's own /favicon.ico. No third-party favicon services are used.
```
````

- [ ] **Step 6: Update release workflow**

Replace `.github/workflows/release.yml` with:

```yaml
name: Build extension ZIPs

on:
  release:
    types: [created]
  workflow_dispatch:

permissions:
  contents: write

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "npm"

      - run: npm ci

      - name: Generate .env from secrets
        env:
          UNSPLASH_ACCESS_KEY: ${{ secrets.UNSPLASH_ACCESS_KEY }}
        run: |
          if [ -z "$UNSPLASH_ACCESS_KEY" ]; then
            echo "::error::UNSPLASH_ACCESS_KEY secret is not set."
            exit 1
          fi
          printf 'UNSPLASH_ACCESS_KEY=%s\n' "$UNSPLASH_ACCESS_KEY" > .env

      - run: npm test

      - run: npm run build

      - run: npm run lint

      - name: Package Firefox ZIP
        run: npm run package -w @topmarks/firefox

      - name: Package Chrome ZIP
        run: |
          cd packages/chrome/dist
          zip -r ../topmarks-chrome-v${{ github.ref_name }}.zip .

      - name: Attach ZIPs to release
        if: github.event_name == 'release'
        uses: softprops/action-gh-release@v2
        with:
          files: |
            packages/firefox/web-ext-artifacts/*.zip
            packages/chrome/topmarks-chrome-*.zip

      - name: Upload ZIPs as workflow artifacts
        if: github.event_name == 'workflow_dispatch'
        uses: actions/upload-artifact@v4
        with:
          name: topmarks-extensions
          path: |
            packages/firefox/web-ext-artifacts/*.zip
            packages/chrome/topmarks-chrome-*.zip
```

- [ ] **Step 7: Update `.env.example`**

Replace `.env.example` with:

```sh
UNSPLASH_ACCESS_KEY=
```

- [ ] **Step 8: Run documentation-safe validation**

Run:

```bash
npm test
npm run build
npm run lint
```

Expected: all commands pass.

- [ ] **Step 9: Commit docs and workflow**

Run:

```bash
git add README.md PRIVACY.md LISTING.md .github/workflows/release.yml .env.example
git commit -m "Update docs and release workflow for monorepo" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds.

## Task 7: Final validation and manual smoke-test checklist

**Files:**
- Modify only if validation finds defects in files touched by earlier tasks.

- [ ] **Step 1: Verify generated outputs from a clean build**

Run:

```bash
rm -rf packages/firefox/dist packages/chrome/dist
npm run build
```

Expected: both `packages/firefox/dist` and `packages/chrome/dist` are regenerated.

- [ ] **Step 2: Run full automated validation**

Run:

```bash
npm test
npm run lint
```

Expected: Node tests pass, Firefox `web-ext lint` passes, and Chrome static output validation passes.

- [ ] **Step 3: Verify Firefox manifest**

Run:

```bash
node -e 'const m=require("./packages/firefox/dist/manifest.json"); console.log(m.manifest_version, m.version, m.permissions.includes("search"))'
```

Expected output:

```text
2 1.8.0 true
```

- [ ] **Step 4: Verify Chrome manifest**

Run:

```bash
node -e 'const m=require("./packages/chrome/dist/manifest.json"); console.log(m.manifest_version, m.version, m.permissions.includes("favicon"))'
```

Expected output:

```text
3 1.8.0 true
```

- [ ] **Step 5: Verify shared runtime has no direct browser API calls**

Run:

```bash
rg "browser\\.|chrome\\." packages/shared/src
```

Expected: no matches.

- [ ] **Step 6: Verify browser-specific API calls stay in adapters**

Run:

```bash
rg "browser\\.|chrome\\." packages/firefox/src packages/chrome/src
```

Expected: matches only in `packages/firefox/src/adapter.js` and `packages/chrome/src/adapter.js`.

- [ ] **Step 7: Run Firefox manual smoke test**

Load `packages/firefox/dist/manifest.json` in Firefox temporary add-ons and verify:

```text
New tab is replaced by Topmarks.
Bookmarks toolbar renders.
Nested folders open.
Overflow chevron appears when the window is narrow.
Settings persist after reload.
Theme, style, bookmarks position, background, and search toggles apply.
Search Enter submits in the current tab.
Search Shift+Enter opens a new tab.
Unsplash background loads and attribution links appear.
Locale strings show translated text when Firefox UI language is supported.
Favicons use page-icon or site /favicon.ico and fall back to the globe.
```

- [ ] **Step 8: Run Chrome manual smoke test**

Load `packages/chrome/dist` as an unpacked Chrome extension and verify:

```text
New tab is replaced by Topmarks.
Bookmarks bar renders from Chrome bookmarks.
Nested folders open.
Overflow chevron appears when the window is narrow.
Settings persist after reload.
Theme, style, bookmarks position, background, and search toggles apply.
Search Enter submits in the current tab.
Search Shift+Enter opens a new tab.
Unsplash background loads and attribution links appear.
Locale strings show translated text when Chrome UI language is supported.
Favicons use Chrome internal favicon URLs or site /favicon.ico and fall back to the globe.
```

- [ ] **Step 9: Commit validation fixes if any were needed**

If Step 1 through Step 8 required file changes, run:

```bash
git add package.json package-lock.json .gitignore scripts test packages README.md PRIVACY.md LISTING.md .github/workflows/release.yml .env.example
git commit -m "Fix monorepo validation issues" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit succeeds only when validation fixes changed tracked files. If no files changed, skip this commit.

- [ ] **Step 10: Report final state**

Run:

```bash
git --no-pager status --short
git --no-pager log --oneline -6
```

Expected: status is clean except ignored generated `dist/` folders, and recent commits match the tasks completed above.
