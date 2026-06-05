import { defineConfig } from "tsup";

// fancy-pixel is an all-in-one embed. The interaction collector
// (@particle-academy/fancy-heuristics-js) is a *bundled* sibling dependency,
// not an external one: tsup auto-externalises anything in `dependencies`, so we
// must explicitly inline it via `noExternal` in EVERY build. For the IIFE global
// this is mandatory — the single `dist/fancy-pixel.global.min.js` is the entire
// external-site embed, so the collector must be compiled INTO it with no bare
// `import`/`require` left behind. For ESM/CJS we inline it too so consumers get
// one self-contained package with no separate install.
const BUNDLE = [/^@particle-academy\/fancy-heuristics-js/];

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
    noExternal: BUNDLE,
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
    // The collector MUST be inlined into the single global embed file.
    noExternal: BUNDLE,
    // Don't wipe the library build that ran in the first config block.
    clean: false,
    // Emit exactly `fancy-pixel.global.min.js` (tsup defaults IIFE to `.global.js`).
    outExtension: () => ({ js: ".js" }),
  },
]);
