import { defineConfig } from "tsup";

export default defineConfig([
  // Library build: ESM + CJS + .d.ts for `import`/`require` consumers.
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    platform: "browser",
    treeshake: true,
  },
  // Global IIFE build for <script>-tag embedding. Minified, self-mounting.
  {
    entry: { "fancy-pixel.global.min": "src/global.ts" },
    format: ["iife"],
    globalName: "FancyPixel",
    minify: true,
    sourcemap: true,
    dts: false,
    platform: "browser",
    treeshake: true,
    // Don't wipe the library build that ran in the first config block.
    clean: false,
    // Emit exactly `fancy-pixel.global.min.js` (tsup defaults IIFE to `.global.js`).
    outExtension: () => ({ js: ".js" }),
  },
]);
