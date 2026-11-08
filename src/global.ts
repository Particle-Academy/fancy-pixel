/**
 * IIFE global entry. Built to `dist/fancy-pixel.global.min.js` with
 * `globalName: "FancyPixel"`. Exposes the public API on `window.FancyPixel`,
 * auto-mounts from the script tag's data-* attributes on load, then runs any
 * commands queued on `window.fancyPixelQ` (see queue.ts). Mounting is
 * once per site key, so a direct tag plus a GTM tag still yields one pixel.
 */
import { autoInit } from "./autoinit.js";
import { mountPixel } from "./mount.js";
import { processQueue } from "./queue.js";

// Run auto-init immediately when the bundle executes (the <script> embed path).
autoInit();
processQueue();

export { mountPixel, autoInit, processQueue };
