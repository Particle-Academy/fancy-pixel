/**
 * IIFE global entry. Built to `dist/fancy-pixel.global.min.js` with
 * `globalName: "FancyPixel"`. Exposes the public API on `window.FancyPixel`
 * AND auto-mounts from the script tag's data-* attributes on load.
 */
import { autoInit } from "./autoinit.js";
import { mountPixel } from "./mount.js";

// Run auto-init immediately when the bundle executes (the <script> embed path).
autoInit();

export { mountPixel, autoInit };
