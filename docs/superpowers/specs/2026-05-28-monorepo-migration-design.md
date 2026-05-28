# Monorepo Migration — Design

**Status:** Approved
**Date:** 2026-05-28

## Summary

Convert Topmarks from a single Firefox-only extension repository into an npm-workspaces monorepo with three packages:

- `packages/shared` — canonical browser-independent new-tab experience.
- `packages/firefox` — small Firefox package that builds a Manifest V2 extension.
- `packages/chrome` — small Chrome package that builds a Manifest V3 extension.

The Firefox and Chrome packages should contain only browser-specific manifests, adapters, packaging config, and build entrypoints. Shared markup, styles, assets, localization, settings, bookmarks UI, Unsplash background logic, search UI, and most runtime behavior live in `packages/shared`.

## Goals

- Preserve current Firefox behavior while moving it into a monorepo.
- Add a Chrome extension with the same user-facing features as the Firefox extension.
- Keep browser packages as small as practical by moving common code and assets into `packages/shared`.
- Avoid a bundler or TypeScript migration for this step; use vanilla JavaScript and small Node build scripts.
- Build each browser package into its own generated `dist/` folder for linting, packaging, and manual loading.

## Non-goals

- Redesigning the new-tab UI.
- Changing the Firefox extension to Manifest V3.
- Adding search suggestions, analytics, telemetry, remote code, or third-party favicon services.
- Introducing a framework, bundler, or TypeScript unless a later spec explicitly calls for it.

## Package layout

```text
package.json
package-lock.json
packages/
  shared/
    package.json
    src/
      newtab.html
      newtab.css
      theme-init.js
      app.js
      bookmarks.js
      settings.js
      search.js
      unsplash.js
      i18n.js
      browser-adapter.js
    assets/
      icons/
      fonts/
      _locales/
  firefox/
    package.json
    manifest.template.json
    src/
      adapter.js
    web-ext-config.cjs
    scripts/
      build.mjs
      build-config.mjs
  chrome/
    package.json
    manifest.template.json
    src/
      adapter.js
    scripts/
      build.mjs
      build-config.mjs
```

Root npm scripts orchestrate workspace commands, for example:

- `npm run build` — build both browser packages.
- `npm run lint` — lint browser outputs with the available validators.
- `npm run build -w packages/firefox` — build only Firefox.
- `npm run build -w packages/chrome` — build only Chrome.

Generated `dist/` folders are ignored by git and are the directories loaded into browsers or packaged for release.

## Architecture

`packages/shared` is the source of truth for the new-tab page. Shared code owns:

- HTML structure for bookmarks, search, settings, and attribution.
- CSS, theme tokens, reduced-motion/reduced-transparency behavior, and layout.
- Theme initialization before stylesheet parsing.
- Bookmark rendering, nested folders, dropdown positioning, overflow handling, and favicon fallback UI.
- Settings defaults, settings panel behavior, storage synchronization, and UI updates.
- Unsplash image fetching, cache/backoff state, attribution links, and download tracking ping.
- Search field behavior and keyboard shortcuts.
- Localization application and shared locale message files.

Shared runtime code must not call `browser.*` or `chrome.*` directly. It receives a browser adapter that implements the required extension APIs behind a stable interface.

`packages/firefox` and `packages/chrome` provide:

- Browser-specific manifest templates.
- A small adapter implementation.
- Config generation for the public Unsplash access key.
- Browser-specific lint/package settings.
- Build scripts that assemble `dist/` from shared source plus browser-specific files.

## Browser adapter interface

The shared app depends on promise-returning adapter methods. Exact names can be finalized during planning, but the interface should cover:

- `getMessage(key)` and `getUILanguage()` for localization.
- `storageGet(defaultsOrKeys)` and `storageSet(values)` for local settings/cache.
- `onStorageChanged(listener)` for Unsplash backoff UI updates.
- `getToolbarBookmarks()` for the bookmarks toolbar contents.
- `onBookmarksChanged(listener)` for rerendering after bookmark changes.
- `search(query, { newTab })` for same-tab or new-tab default-engine search.
- `faviconSources(url)` for browser-appropriate favicon candidates.

Adapters normalize browser differences so shared modules can stay browser-independent.

### Firefox adapter

Firefox keeps the current Manifest V2 model and Firefox-specific APIs:

- `browser.bookmarks.getSubTree("toolbar_____")` for the bookmarks toolbar.
- `browser.search.search()` for default search engine queries.
- `browser.tabs.getCurrent()` and `browser.tabs.create()` for search destination.
- `browser.i18n` and `browser.storage.local`.
- Firefox favicon strategy: `page-icon:<url>` first, then the bookmarked site's own `/favicon.ico`, then the shared globe icon fallback.

### Chrome adapter

Chrome uses Manifest V3 and Chrome APIs:

- Locate the bookmarks bar/root from Chrome's bookmark tree instead of using Firefox's toolbar ID.
- Use Chrome's search API for default search engine queries when available.
- Wrap callback-style APIs in promises where needed.
- Use a Chrome-safe favicon strategy that avoids third-party favicon lookup services, falling back to the bookmarked site's own `/favicon.ico` and then the shared globe icon.

If a Chrome API is unavailable or fails, the adapter rejects. Shared code logs the failure with the existing Topmarks-style console messages rather than returning success-shaped fallbacks.

## Build flow

Each browser package has a build script that:

1. Cleans its `dist/` directory.
2. Copies shared HTML, CSS, runtime modules, assets, and locales into `dist/`.
3. Copies its browser-specific adapter into `dist/`.
4. Generates `config.local.js` from `.env`, allowlisting only `UNSPLASH_ACCESS_KEY`.
5. Writes the browser-specific `manifest.json`.

The build keeps secrets out of source control. The Unsplash secret key must never be emitted; only the public access key is written into generated client-side config.

## Runtime data flow

1. The new tab loads shared `theme-init.js` to set theme/style/bookmark-position attributes from local storage before CSS parses.
2. Shared CSS and HTML render the static page shell.
3. The browser-specific adapter loads before shared app code.
4. Shared app bootstrap applies i18n, loads settings through the adapter, applies theme/style/layout classes, wires settings/search/bookmarks handlers, renders bookmarks, and loads the cached or fresh Unsplash background.
5. User actions call shared handlers, which delegate browser-only work to the adapter.

## Error handling

- Bookmark loading failures show the existing localized load-error state and log the original error.
- Search failures are logged as `[Topmarks] Search submit failed:` and leave the page state unchanged, matching current Firefox behavior.
- Unsplash failures keep the existing exponential backoff, cached-background fallback, settings-panel error visibility, and console diagnostics.
- Missing `.env` or missing Unsplash access key during packaging fails fast instead of producing a broken release artifact.
- Invalid or unsupported favicon URLs fall back to the shared globe icon. No adapter may introduce a third-party favicon service.

## Documentation and release updates

Update project documentation to describe:

- Monorepo package layout.
- How to build and load the Firefox extension.
- How to build and load the Chrome extension.
- How `.env` and `UNSPLASH_ACCESS_KEY` are handled per package.
- Browser-specific limitations or API differences.

Update privacy and listing copy so it is no longer Firefox-only and includes the search permission where applicable. Update GitHub Actions to build/lint/package browser outputs from their workspace `dist/` folders.

## Migration order

1. Create npm workspaces and package directories.
2. Move shared runtime files, assets, and locales into `packages/shared`.
3. Build Firefox output from shared source while preserving current Firefox behavior.
4. Introduce the adapter boundary and remove direct browser API calls from shared code.
5. Add the Chrome MV3 package and Chrome adapter.
6. Update docs, listing/privacy copy, ignore rules, and CI release workflow.

## Validation

Automated validation should use existing ecosystem tools where possible:

- Build both browser packages.
- Run Firefox `web-ext lint` against the generated Firefox output.
- Run any available Chrome extension manifest/package validation that does not require adding a heavyweight tool.

Manual smoke tests should cover both browsers:

- New tab page replaces the default new tab.
- Bookmarks toolbar renders, including folders, nested folders, overflow, empty state, and bookmark updates.
- Settings persist and apply: hide folder icons, center bookmarks, background image, search field, theme, style, and bookmarks position.
- Search submits to the default search engine in the same tab and new tab modifier flow.
- Unsplash background loads, caches, respects refresh interval, shows attribution, and backs off on failure.
- Locale strings resolve.
- Favicons do not use third-party favicon services.
- Reduced motion and reduced transparency preferences remain respected.

## Open questions

None. The approved direction is npm workspaces, Firefox Manifest V2, Chrome Manifest V3, generated per-browser `dist/` outputs, and minimal vanilla JavaScript build scripts.
