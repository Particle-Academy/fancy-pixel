# @particle-academy/fancy-pixel

[![Fancified](art/fancified.svg)](https://particle.academy)

**All-in-one Fancy UI embed.** A single `<script>` renders the verification
**badge** AND pipes the site's full interaction analytics to your host —
Google-Analytics-style, keyed by `site_key`. Vanilla TypeScript, rendered
inside an **open Shadow DOM** so the host page's CSS cannot hide it (visibility
is part of verification).

One embed delivers three things:

1. **Badge** — a "Powered by Fancy UI" chip / mark / beacon, host-CSS-proof.
2. **Verification beacon** — a `sendBeacon` liveness ping to `${endpoint}/pixel`
   on mount and every visibility change (proves the badge is really on-screen).
3. **Interaction analytics** — clicks, scroll depth, pointer heatmap, dwell, and
   embedded-agent activity streamed to `${endpoint}/collect` via the bundled
   [`@particle-academy/fancy-heuristics-js`](https://github.com/Particle-Academy/fancy-heuristics-js)
   collector.

The collector is **bundled** into every build (including the single IIFE global
embed) — there is no separate install. The only third-party-free dependency is a
sibling `@particle-academy` package. **No `endpoint` = badge only** (no beacon,
no collection, no network at all).

Three styles, two placement modes:

| Style    | Renders                                  |
| -------- | ---------------------------------------- |
| `badge`  | "Powered by Fancy UI" wordmark + glyph   |
| `mark`   | Logo glyph only                          |
| `beacon` | A small pulsing dot                      |

| Mode       | Placement                                |
| ---------- | ---------------------------------------- |
| `placed`   | Inline at a target selector/element      |
| `floating` | `position: fixed` bottom-right corner    |

Every style emits the same `data-fancy-badge` marker the Fancy UI showcase
scanner detects, plus a stable `data-fancy-pixel` handle and
`data-fancy-pixel-style`.

## Install

```bash
npm install @particle-academy/fancy-pixel
```

## Embed via `<script>` (no build step)

A single tag both loads and auto-mounts, reading config from its own
`data-*` attributes. With an `endpoint`, this **one tag** mounts the badge, fires
the verification beacon, and starts streaming interaction analytics:

```html
<script
  src="https://unpkg.com/@particle-academy/fancy-pixel/dist/fancy-pixel.global.min.js"
  data-style="badge"
  data-mode="floating"
  data-site="YOUR_SITE_KEY"
  data-endpoint="https://your-host/heuristics"
></script>
```

Attributes: `data-style` (`badge`|`mark`|`beacon`), `data-mode`
(`placed`|`floating`), `data-site`, `data-endpoint`, optional `data-target`
(selector, for `placed`), `data-href` (link target), and `data-collect`.

**Badge-only opt-out:** add `data-collect="false"` to render the badge and send
the liveness beacon but **not** stream interaction analytics:

```html
<script
  src="https://unpkg.com/@particle-academy/fancy-pixel/dist/fancy-pixel.global.min.js"
  data-site="YOUR_SITE_KEY"
  data-endpoint="https://your-host/heuristics"
  data-collect="false"
></script>
```

Omit `data-endpoint` entirely for a pure badge with no network of any kind.

The global build also exposes `window.FancyPixel.mountPixel(...)` for manual
mounts.

## Programmatic usage

```ts
import { mountPixel } from "@particle-academy/fancy-pixel";

const pixel = mountPixel({
  style: "badge", // "badge" | "mark" | "beacon"
  mode: "floating", // "placed" | "floating"
  target: "#footer", // selector or Element (placed mode)
  siteKey: "YOUR_SITE_KEY",
  endpoint: "https://your-host/heuristics",
  collect: true, // default; set false for badge + beacon only
  href: "https://particle.academy", // optional link target
});

// pixel.host      -> the host element (open shadow root + data markers)
// pixel.visible   -> current IntersectionObserver-confirmed visibility
// pixel.collector -> the live interaction collector (null when collect is off
//                    or no endpoint); started for you, stopped by destroy()
// pixel.destroy() -> stop the collector, tear down observers, remove the element
```

## Visibility + beacon

- An **IntersectionObserver** confirms the badge is genuinely on-screen — not
  `display:none`, off-screen, or 0-size.
- On first confirmed visibility a `fancy-pixel:shown` `CustomEvent` is
  dispatched on `document` (so hosts/agents can observe it).
- On mount **and** on every visibility change the pixel POSTs to
  `${endpoint}/pixel` via `navigator.sendBeacon` (falling back to
  `fetch(..., { keepalive: true })`):

  ```json
  {
    "siteKey": "YOUR_SITE_KEY",
    "style": "badge",
    "mode": "floating",
    "visible": true,
    "path": "/some/page",
    "ts": 1717600000000
  }
  ```

  If `endpoint` is omitted, no network request is made.

## Interaction analytics (all-in-one)

When mounted **with** an `endpoint` and `collect` left on (the default),
fancy-pixel also starts the bundled
[`@particle-academy/fancy-heuristics-js`](https://github.com/Particle-Academy/fancy-heuristics-js)
collector. It batches the site's interaction stream — `pageview`, `click`,
`scroll` depth, `pointer` heatmap samples, `dwell` time, and embedded-**agent**
activity — and ships it to `${endpoint}/collect` via `sendBeacon`, keyed by the
same `siteKey`. Batches POST as:

```json
{ "siteKey": "YOUR_SITE_KEY", "sessionId": "...", "events": [ /* Event, ... */ ] }
```

Each `Event` is the frozen `fancy-heuristics` wire shape (`kind`, `actor`,
`path`, `ts`, plus `x`/`y`/`vw`/`vh`/`scrollPct`/`dwellMs`/`targetId`/`label` as
relevant) — the exact shape the PHP `fancy-heuristics` ingestion already
validates. `destroy()` stops the collector (flushing any buffered events).

- **Opt out** with `collect: false` (programmatic) or `data-collect="false"`
  (script tag) to keep the badge + liveness beacon but skip analytics.
- **No endpoint = nothing collected.** A badge with no `endpoint` makes no
  network requests at all.

The collector is compiled directly into `dist/fancy-pixel.global.min.js`, so the
single external-site embed carries everything — no second `<script>`, no extra
install.

## Human+ contract

This is a mostly-visual component, but it is **inhabitable**: it exposes a
stable handle (`data-fancy-pixel`), emits the `data-fancy-badge` marker for
server-side scanners, and dispatches `fancy-pixel:shown` so presence/coaching
layers can compose for free.

## Demo

`demo/index.html` mounts all styles/modes and intercepts `sendBeacon`/`fetch`
to log the `/heuristics/pixel` round-trip offline. Serve the package root over
any static server and open `/demo/index.html` after `npm run build`.

## Build

```bash
npm run build   # tsup -> dist/index.js (ESM), dist/index.cjs (CJS),
                #         dist/fancy-pixel.global.min.js (IIFE, globalName FancyPixel)
                # @particle-academy/fancy-heuristics-js is inlined into ALL three
                # bundles (never externalized), so the global is fully standalone.
npm test        # node --test against the built ESM bundle
```

## License

MIT
