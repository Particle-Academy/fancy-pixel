/**
 * Public types for @particle-academy/fancy-pixel.
 *
 * The pixel is an embeddable verification badge + liveness beacon. Three
 * visual styles, two placement modes. All styles emit the same
 * `data-fancy-badge` marker the showcase scanner already detects.
 */

/** Visual style of the pixel. */
export type PixelStyle = "badge" | "mark" | "beacon";

/** Placement mode. `placed` mounts inline at a target; `floating` pins a fixed corner. */
export type PixelMode = "placed" | "floating";

/** Options accepted by {@link mountPixel}. */
export interface MountPixelOptions {
  /** Visual style. Default `"badge"`. */
  style?: PixelStyle;
  /** Placement mode. Default `"floating"`. */
  mode?: PixelMode;
  /**
   * For `placed` mode: a CSS selector string or an Element to mount inside.
   * Ignored in `floating` mode. Defaults to `document.body`.
   */
  target?: string | Element | null;
  /** Site identifier sent with every beacon. Required for meaningful beacons. */
  siteKey?: string;
  /**
   * Base URL of the fancy-heuristics ingestion host. The pixel POSTs the
   * liveness beacon to `${endpoint}/pixel` and (when {@link collect} is on)
   * streams interaction analytics to `${endpoint}/collect`. If omitted, the
   * pixel renders badge-only — no beacon, no collection, no network at all.
   */
  endpoint?: string;
  /**
   * Stream full interaction analytics (clicks / scroll depth / pointer heatmap /
   * dwell + agent activity) to `${endpoint}/collect` via the bundled
   * `@particle-academy/fancy-heuristics-js` collector. Defaults to `true` — one
   * embed delivers badge + verification + analytics, Google-Analytics-style.
   * Set to `false` (or `data-collect="false"`) to render the badge and send the
   * liveness beacon only. Has no effect when {@link endpoint} is omitted.
   */
  collect?: boolean;
  /**
   * Wordmark/link target. Defaults to `https://particle.academy`.
   * Applies to `badge` (whole chip) and `mark` (glyph).
   */
  href?: string;
}

/** The payload POSTed to `${endpoint}/pixel`. Matches the frozen wire contract. */
export interface PixelBeaconPayload {
  siteKey: string;
  style: PixelStyle;
  mode: PixelMode;
  visible: boolean;
  path: string;
  ts: number;
}

/**
 * Minimal structural shape of the bundled fancy-heuristics-js collector handle.
 * Mirrors `@particle-academy/fancy-heuristics-js`'s `Collector` so we don't
 * leak the dependency's types into the public surface.
 */
export interface PixelCollector {
  start(): void;
  stop(): void;
  flush(): void;
}

/** Handle returned by {@link mountPixel} for programmatic control. */
export interface PixelHandle {
  /** The host element carrying the open shadow root and data markers. */
  readonly host: HTMLElement;
  /** Whether the pixel is currently confirmed visible by the IntersectionObserver. */
  readonly visible: boolean;
  /**
   * The live interaction collector, when one was started (endpoint set and
   * `collect !== false`). `null` for badge-only / beacon-only mounts.
   * `destroy()` stops it automatically; exposed for observability + testing.
   */
  readonly collector: PixelCollector | null;
  /** Resolved options. */
  readonly options: Required<Omit<MountPixelOptions, "target">> & {
    target: string | Element | null;
  };
  /** Stop the collector, tear down observers, and remove the host element. */
  destroy(): void;
}

/** Detail of the `fancy-pixel:shown` CustomEvent dispatched on `document`. */
export interface PixelShownEventDetail {
  style: PixelStyle;
  mode: PixelMode;
  siteKey: string;
  host: HTMLElement;
}
