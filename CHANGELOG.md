# Changelog

All notable changes to `@particle-academy/fancy-pixel` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Pre-1.0:** breaking changes land in MINOR releases. Until 1.0 the minor
> number is not a compatibility promise — read the entry, not the version.

> This file starts here. Earlier releases predate it and were never written up;
> `git log` is the record for those. It is not backfilled rather than
> guessed-at, because a changelog that invents its own history is worse than one
> that admits where it begins.

## [Unreleased]

## 0.4.0 — 2026-11-08

Bundles `@particle-academy/fancy-heuristics-js` 0.4, which needs
`particle-academy/fancy-heuristics` 0.6 on the server. Upgrade the server
first. An older server still stores views, clicks, scroll and time, but not
the new fields.

### Changed

- **BREAKING — consent is denied by default. With no `consent` option (or no
  `data-consent="granted"`), no analytics are collected.** The badge still
  renders and the liveness beacon still fires; in development one console
  warning says why nothing is collected. **What you must do:** pass
  `consent: true` or a consent callback, or wire fancy-compliance, otherwise
  nothing is collected. On a script tag, write `data-consent="granted"` only
  once the visitor has agreed, or push
  `["consent", { analytics: true }]` onto `window.fancyPixelQ` when they do.
- **BREAKING — the bundled collector is 0.4 (wire format v2).** Click labels
  now come from the clicked control only (react-fancy handles and the
  control's accessible name) instead of a container's text; single-page
  navigations record a view; the page title and route are separate fields;
  agent activity is no longer recorded as a click; dwell is active time;
  scroll is milestones. **Pointer heatmap samples are off by default.**
  **What you must do:** upgrade `fancy-heuristics` to 0.6 first. Pass
  `collectLevel: "research"` (or `data-collect-level="research"`) if you want
  pointer heatmaps. See the collector's changelog for the full list.
- **BREAKING — one pixel per site key.** A second `mountPixel` (or a second
  script tag) with the same `siteKey` returns the pixel already mounted,
  applies its `consent`, and logs one console warning, instead of rendering a
  second badge and starting a second collector. **What you must do:**
  nothing, unless you mounted two pixels with one key on purpose; call
  `destroy()` on the first before mounting again.

### Added

- **`consent`** (`data-consent`), forwarded to the collector: `true` /
  `"granted"`, `false` / `"denied"`, or a callback read at start.
  `handle.setConsent(granted)` changes it later.
- **`collectLevel`** (`data-collect-level`), **`track`**, **`route`** and
  **`labels`** (`data-labels`), forwarded to the collector.
- **`handle.setConsent(granted)`** and **`handle.view()`**.
- **A command queue, `window.fancyPixelQ`**, with `init`, `consent` and
  `route` commands. Queued commands run on load and later pushes run at
  once; `features` is reserved and ignored for now. Exported as
  `processQueue()` / `runCommand()`.

### Fixed

- **`href` is now escaped before it goes into the badge's markup.** A quote or angle bracket in `href` could end the attribute and add markup inside the pixel's shadow root. Only the embedding site sets `href`, so this was hardening rather than a vulnerability. Ordinary URLs render exactly as before.

## 0.3.1 — 2026-11-08

### Security

- **A long endpoint could stall the page.** The beacon removed trailing slashes from `endpoint` with a regular expression whose running time grows with the square of the input. An endpoint containing a long run of slashes could block the host page's main thread for seconds. The slashes are now removed with a simple linear loop, the same way `@particle-academy/fancy-heuristics-js` already does it. The resulting URL is identical for every input. Nothing for you to do beyond upgrading.

### Fixed

- **`CHANGELOG.md` is now in the published tarball.** `files` did not whitelist it, so npm never shipped it — and this package puts breaking changes in MINOR releases and tells you in the README to read the entry before taking one. The instruction existed for the author, who has the file, and not for the consumer, who is the only one being instructed. Nothing for you to do; the file simply arrives from this release on.

## 0.3.0 — 2026-08-07

### Changed

- **BREAKING — Node 18 is no longer supported.** `engines.node` moves from `>=18` to `>=22`.

  **What you must do:** on Node 22 or newer, nothing. Note npm only *warns* on an `engines` mismatch while **pnpm fails the install**, so this surfaces differently depending on your package manager. Node 18 is end-of-life and 20 is maintenance-only.

### Why

These are the kit 0.5 platform floors, applied across every package at once so a consumer never has to resolve a mix. **No API changed, nothing was removed, nothing was renamed** — only what the package requires.


## 0.2.3 — 2026-08-06

### Fixed

- **The badge linked to the wrong site.** `href` defaulted to
  `https://particle.academy`, which is *Particle Academy — The Community
  Accelerator*, a different property. The Fancy UI kit lives at
  **`https://ui.particle.academy`**, and that is now the default.

  **What you must do:** nothing, unless you were relying on the old target. The
  badge is the one outbound link the pixel places on your site, so every badge
  shipped before this release has been sending visitors somewhere that says
  nothing about the kit they just saw the badge for. Upgrading fixes it; a
  pinned `href` is still honoured and overrides the default as before.

  Both the README example and the `href` doc comment said the same wrong thing,
  so anyone who copied the snippet has it hardcoded — search your own embeds for
  `href: "https://particle.academy"` and drop the line to pick up the default.

## [0.2.2] — 2026-07-28

### Fixed

- **0.2.1 did not actually contain the range widen its entry describes.** The
  `@particle-academy/fancy-heuristics-js` requirement went out as a caret, not
  `>=0.1 <2.0`. The widen was real when it was written and was then
  silently reverted before the tag: verifying it meant running
  `npm install @particle-academy/fancy-heuristics-js@latest` to prove the
  package builds against the newest sibling, and that command **rewrites the
  range in `package.json` to a caret on whatever it just installed**. The
  verification step overwrote the thing it was verifying.

  0.2.1 is still an improvement on what came before it — the caret it shipped
  points at the current sibling rather than a stale one, so the install that was
  failing now succeeds. It just re-imposes the same cap one minor later. 0.2.2
  carries the range the entry promised.

  `devDependencies` deliberately keeps a caret: that pin is the version the
  suite is built and tested against, and it is what makes the wide runtime range
  a tested claim rather than a hopeful one.

## [0.2.1] — 2026-07-28

### Changed

- Widened the `@particle-academy/fancy-heuristics-js` requirement from `^0.1.0` to `>=0.1 <2.0`, so a
  sibling minor release is an upgrade and not a resolver conflict. **No action
  needed** — widening a range only adds candidates; the version you have today
  still resolves.

  A caret on a `0.x` range locks the MINOR, so this pinned a sibling at
  whatever it happened to be on the day it was written, and each sibling
  release then read as a conflict to the resolver rather than an upgrade.
  Nothing here was using an API the newer minors removed — the range was the
  whole problem.

  This one was **already blocking**: the sibling had shipped past the cap,
  so installing the two together resolved to an old copy or refused
  outright. Nothing reported it, because a resolver quietly picking an older
  version looks exactly like success.
