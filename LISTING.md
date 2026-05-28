# Store listing copy

Text to paste into Firefox Add-ons and Chrome Web Store submission forms. Keep this in sync with the actual extension behavior.

## Summary

> 250-character limit. Current: 199 chars.

```
Floats your bookmarks toolbar at the top of every new tab, over a curated rotating wallpaper from Unsplash. Glass or Classic style, light/dark themes, 7 languages. No tracking, no analytics.
```

## Description

> Markdown is supported (basic). Paste into the AMO description field.

```markdown
**Topmarks** floats your bookmarks toolbar at the top of every new tab in Firefox or Chrome, over a rotating wallpaper from Unsplash. Designed to be minimal, fast, and unobtrusive.

**Features**

- **Bookmarks where you want them.** Your Bookmarks Toolbar appears as a clean pill at the top of every new tab. Folders open as dropdowns; nested folders cascade as side menus.
- **Curated wallpapers.** Each session loads a high-resolution photo from a curated Unsplash collection, sized to your display (up to 4K). Pick a refresh interval: every 1, 6, 12, or 24 hours.
- **Two styles.** Pick **Glass** for a frosted-glass aesthetic with backdrop blur, or **Classic** for solid surfaces and a flush-anchored bar.
- **Light, Dark, or Auto.** Follows your system theme or whatever you choose.
- **7 languages.** English, Spanish, French, Italian, German, Japanese, and Simplified Chinese — auto-detects your browser UI language.
- **Accessibility-aware.** Respects prefers-reduced-motion and prefers-reduced-transparency. Folder dropdowns are keyboard-navigable with proper ARIA semantics.

**Privacy**

Topmarks does **not** collect, transmit, or store your bookmarks, browsing history, or any personal identifier. The only outbound network request is to api.unsplash.com when wallpapers are enabled, to fetch a random photo. Favicons load from each bookmarked site's own /favicon.ico — no third-party favicon services. No analytics. No telemetry. No remote code.

Full privacy policy: https://github.com/nx-alejandrolacasa/topmarks/blob/main/PRIVACY.md

**Source & license**

Open source under the MIT License.

GitHub: https://github.com/nx-alejandrolacasa/topmarks

Photos courtesy of Unsplash.
```

## Categories

- New Tab Page
- Appearance

## Tags

`bookmarks`, `new tab`, `wallpaper`, `unsplash`, `minimal`

## Notes for reviewer

> Paste into AMO's "Notes for reviewer" field on submission.

```
This extension reads bookmarks via the bookmarks API and renders the
toolbar on the new tab page. The only network destination is
api.unsplash.com (when "Show background image" is enabled), used to
fetch a random photo from Unsplash's curated wallpaper collection
1053828.

Build: config.local.js is generated from .env by npm run build:firefox
(or npm run build for both browser outputs). The generated config.local.js
contains only the public Unsplash Access Key (Client-ID), per Unsplash's API
guidelines for client-side apps.

Favicons are loaded via Firefox's internal page-icon: scheme first
(no network), falling back to the bookmarked site's own /favicon.ico.
No third-party favicon services are used.

No analytics, telemetry, or crash reporting. No remote code. No
content scripts. Bookmarks data never leaves the browser.
```

## Chrome notes for reviewer

```text
This Manifest V3 extension reads the bookmarks bar via the bookmarks API and renders it on the new tab page. The only network destination is api.unsplash.com when "Show background image" is enabled. Favicons are loaded from Chrome's internal favicon store first, falling back to each bookmarked site's own /favicon.ico. No third-party favicon services are used.
```
