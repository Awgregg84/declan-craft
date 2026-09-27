# Declan-craft

A block-building game made for Declan. It has two worlds to explore (Sunny Valley and Sky Islands), mining, crafting, building, animals and monsters, day and night, and survival and creative modes. Everything in it, including the worlds, textures, characters and sounds, is generated in code.

**Play:** https://awgregg84.github.io/declan-craft/

## On an iPad or iPhone

1. Open the link above in Safari.
2. Tap **Share**, then **Add to Home Screen**.
3. Open Declan-craft from the new icon once while online. After that it also works without internet.

Worlds are saved on the device. Deleting the Home Screen icon deletes its saved worlds.

## Building

Requires Node.js.

- `node build.mjs` writes `dist/site/` (the website, published on the `gh-pages` branch) and `dist/declan-craft.html` (a single file that opens in a desktop browser).
- `node tools/make-assets.mjs` regenerates the icons and link-preview picture in `assets/`. It needs Playwright.
- `test/` holds browser tests that use Playwright with Chromium, for example `node test/site.mjs`.

## Layout

- `src/js/`: game code, joined in file-name order
- `src/style.css`, `src/body.html`: screens and controls
- `src/site/`: offline support (`sw.js`) and the Home Screen app manifest
- `assets/`: icons and link-preview picture
