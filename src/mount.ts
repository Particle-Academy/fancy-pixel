import { sendPixelBeacon } from "./beacon.js";
import { createPixelCollector } from "./collector.js";
import { createPixelHost } from "./render.js";
import type {
  MountPixelOptions,
  PixelCollector,
  PixelHandle,
  PixelMode,
  PixelShownEventDetail,
  PixelStyle,
} from "./types.js";

const DEFAULT_HREF = "https://particle.academy";
const STYLES: PixelStyle[] = ["badge", "mark", "beacon"];
const MODES: PixelMode[] = ["placed", "floating"];

function resolveTarget(target: string | Element | null | undefined): Element {
  if (target instanceof Element) return target;
  if (typeof target === "string") {
    const found = document.querySelector(target);
    if (found) return found;
  }
  return document.body;
}

function currentPath(): string {
  return typeof location !== "undefined" ? location.pathname : "/";
}

/**
 * Mount a Fancy UI pixel into the page.
 *
 * Renders the chosen style inside an open Shadow DOM (host CSS cannot hide it),
 * wires an IntersectionObserver to confirm true on-screen visibility, dispatches
 * a `fancy-pixel:shown` CustomEvent on first visibility, and POSTs a liveness
 * beacon to `${endpoint}/pixel` on mount and on every visibility change.
 *
 * When `endpoint` is set and `collect` is left on (the default), it ALSO starts
 * the bundled `@particle-academy/fancy-heuristics-js` collector, streaming the
 * site's full interaction data (clicks / scroll depth / pointer heatmap / dwell
 * + agent activity) to `${endpoint}/collect` — one embed does badge +
 * verification + analytics. With no `endpoint`, nothing is sent (badge only).
 */
export function mountPixel(opts: MountPixelOptions = {}): PixelHandle {
  const style: PixelStyle = STYLES.includes(opts.style as PixelStyle)
    ? (opts.style as PixelStyle)
    : "badge";
  const mode: PixelMode = MODES.includes(opts.mode as PixelMode)
    ? (opts.mode as PixelMode)
    : "floating";
  const siteKey = opts.siteKey ?? "";
  const endpoint = opts.endpoint ?? "";
  const collect = opts.collect !== false; // default on; only an explicit false opts out
  const href = opts.href ?? DEFAULT_HREF;
  const target = opts.target ?? null;

  const host = createPixelHost(style, mode, href);

  // Mount: floating always pins to body; placed flows at the target.
  if (mode === "floating") {
    document.body.appendChild(host);
  } else {
    resolveTarget(target).appendChild(host);
  }

  let visible = false;
  let shownDispatched = false;
  let destroyed = false;

  function beacon(): void {
    if (!endpoint) return;
    sendPixelBeacon(endpoint, {
      siteKey,
      style,
      mode,
      visible,
      path: currentPath(),
      ts: Date.now(),
    });
  }

  function dispatchShownOnce(): void {
    if (shownDispatched) return;
    shownDispatched = true;
    const detail: PixelShownEventDetail = { style, mode, siteKey, host };
    document.dispatchEvent(
      new CustomEvent<PixelShownEventDetail>("fancy-pixel:shown", { detail }),
    );
  }

  // Visibility verification. IntersectionObserver confirms the badge is truly
  // on-screen — not display:none, not 0-size, not scrolled out of view. When
  // unavailable (old/headless UAs) we optimistically assume visible so the
  // liveness beacon still fires.
  let observer: IntersectionObserver | null = null;

  function setVisible(next: boolean): void {
    if (destroyed || next === visible) return;
    visible = next;
    if (visible) dispatchShownOnce();
    beacon();
  }

  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        // intersectionRatio > 0 with a non-zero box = genuinely rendered.
        const rect = entry.boundingClientRect;
        const hasSize = rect.width > 0 && rect.height > 0;
        setVisible(entry.isIntersecting && entry.intersectionRatio > 0 && hasSize);
      },
      { threshold: [0, 0.01, 0.5] },
    );
    observer.observe(host);
  } else {
    // No IO support — fire an optimistic visible beacon on mount.
    setVisible(true);
  }

  // Always emit a mount beacon so the server logs liveness even before the
  // observer reports (visible defaults false until proven).
  beacon();

  // All-in-one analytics: with an endpoint and collection left on, start the
  // bundled fancy-heuristics-js collector so this single embed also streams the
  // site's interaction data to `${endpoint}/collect`, keyed by siteKey. No
  // endpoint => no collection (badge-only), matching the beacon's behaviour.
  let collector: PixelCollector | null = null;
  if (endpoint && collect) {
    try {
      collector = createPixelCollector({ siteKey, endpoint });
      collector.start();
    } catch {
      // A collector failure must never break the host page or the badge.
      collector = null;
    }
  }

  const resolved: PixelHandle["options"] = {
    style,
    mode,
    siteKey,
    endpoint,
    collect,
    href,
    target,
  };

  return {
    host,
    get visible() {
      return visible;
    },
    get collector() {
      return collector;
    },
    options: resolved,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      observer = null;
      if (collector) {
        try {
          collector.stop();
        } catch {
          /* swallow — teardown must never throw into the host */
        }
        collector = null;
      }
      host.remove();
    },
  };
}
