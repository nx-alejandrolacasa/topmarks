# Topmarks

A minimal browser new-tab extension for Firefox and Chrome that floats your bookmarks toolbar at the top of every new tab, over a rotating Unsplash wallpaper.

## Features

- Floating glass bookmarks bar with folder dropdowns and nested submenus
- Rotating high-resolution wallpapers from Unsplash's curated wallpaper collection
- Light / Dark / Auto theme
- Configurable background refresh interval (1h / 6h / 12h / 24h)
- 7 languages: English, Spanish, French, Italian, German, Japanese, Chinese (Simplified)
- Liquid-glass aesthetic with backdrop blur, inspired by iOS 26
- Respects `prefers-reduced-motion` and `prefers-reduced-transparency`
- Privacy-respecting: no analytics, no third-party trackers, bookmarks never leave your device

Topmarks ships as separate Firefox and Chrome extension packages from the same shared source.

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

## Configuration

Click the gear icon at the bottom-right of the new tab page:

- **Hide folder icons** — show only bookmark titles
- **Center bookmarks in bar** — center-align instead of left-aligning
- **Show background image** — toggle Unsplash wallpaper on/off
- **Theme** — Auto / Light / Dark
- **Refresh background every** — 1h / 6h / 12h / 24h
- **Refresh background now** — fetch a fresh photo immediately

Settings persist in `browser.storage.local` and are wiped on uninstall.

## Privacy

The extension does not collect, transmit, or store your bookmarks, browsing history, or any personal identifier. When backgrounds are enabled, the extension makes HTTPS requests to `api.unsplash.com` for a random wallpaper. Favicons load directly from each bookmarked site's own `/favicon.ico` — no third-party favicon services.

Full policy: [PRIVACY.md](./PRIVACY.md).

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

## Credits

- [Unsplash](https://unsplash.com) — photo API and the curated wallpaper collection.
- [Tabliss](https://github.com/joelshepherd/tabliss) — collection ID and the screen-aware image-sizing approach (snap to 240px increments, clamp 1920–3840px).

## License

Released under the [MIT License](./LICENSE).
