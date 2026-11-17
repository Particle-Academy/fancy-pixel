# Contributing to @particle-academy/fancy-pixel

Notes for anyone, human or agent, working ON this package's code. How to USE the
package is in [AGENTS.md](./AGENTS.md); what it is, is in [README.md](./README.md).
`CLAUDE.md` is a symlink to this file, so Claude Code reads these notes when it
works in this repo.

## Build

```bash
npm run build   # tsup -> dist/index.js (ESM), dist/index.cjs (CJS),
                #         dist/fancy-pixel.global.min.js (IIFE, globalName FancyPixel)
                # @particle-academy/fancy-heuristics-js is inlined into ALL three
                # bundles (never externalized), so the global is fully standalone.
npm test        # node --test against the built ESM bundle
npm run lint    # tsc --noEmit
```

- `pretest` runs the build, so the tests in `tests/*.test.mjs` exercise the real
  bundle.

## Demo

`demo/index.html` mounts all styles/modes and intercepts `sendBeacon`/`fetch`
to log the `/heuristics/pixel` round-trip offline. Serve the package root over
any static server and open `/demo/index.html` after `npm run build`.

## Changelog

Update `CHANGELOG.md` (`## [Unreleased]`) in the same commit as the change.
