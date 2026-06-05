# @particle-academy/fancy-pixel

Embeddable **Fancy UI verification badge + liveness beacon**. Zero runtime
dependencies, vanilla TypeScript, rendered inside an **open Shadow DOM** so the
host page's CSS cannot hide it — visibility is part of verification.

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
`data-*` attributes:

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
(selector, for `placed`) and `data-href` (link target).

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
  href: "https://particle.academy", // optional link target
});

// pixel.host    -> the host element (open shadow root + data markers)
// pixel.visible -> current IntersectionObserver-confirmed visibility
// pixel.destroy() -> tear down observers and remove the element
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
npm test        # node --test against the built ESM bundle
```

## License

MIT
